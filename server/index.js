const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const chokidar = require('chokidar');
const path = require('path');
const multer = require('multer'); 
const fs = require('fs');

const { initDb, Book, AudioFile, PlaybackProgress, User } = require('./database');
const LibraryScanner = require('./services/scanner');
const scraper = require('./services/scraper');
const { buildRenamePlan, applyRenamePlan } = require('./services/renamer');
const streamRoutes = require('./routes/stream');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const LIBRARY_PATH = process.env.LIBRARY_PATH || './mnt/library';
const UPLOAD_PATH = path.join(LIBRARY_PATH, 'uploads'); 

if (!fs.existsSync(UPLOAD_PATH)) {
    fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadSubDir = req.body.folderName ? path.join(UPLOAD_PATH, req.body.folderName) : UPLOAD_PATH;
    if (!fs.existsSync(uploadSubDir)) fs.mkdirSync(uploadSubDir, { recursive: true });
    cb(null, uploadSubDir);
  },
  filename: function (req, file, cb) {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, originalName);
  }
});
const upload = multer({ storage: storage });

app.use('/api/stream', streamRoutes);

const scanner = new LibraryScanner(LIBRARY_PATH);

// ✅ 改动 1: 将 Watcher 逻辑封装成函数，而不是直接执行
const startWatcher = () => {
    console.log('[Watcher] Starting file watcher...');
    const watcher = chokidar.watch(LIBRARY_PATH, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      depth: 2, 
      awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 }
    });

    watcher.on('ready', () => {
      console.log('[Watcher] Ready. Initial Scan...');
      scanner.scanLibrary(); // Default scan on boot
    });

    watcher.on('addDir', (dirPath) => {
        if (dirPath.includes('uploads') || dirPath === LIBRARY_PATH) return; 
        scanner.scanFolder(dirPath).then(book => {
            if(book) io.emit('library_update', { type: 'add', book });
        });
    });
};

app.get('/api/books', async (req, res) => {
  try {
    const defaultUser = await User.findOne({ where: { username: 'local' } });
    const progresses = await PlaybackProgress.findAll({ where: defaultUser ? { UserId: defaultUser.id } : {} });
    const progressMap = new Map(progresses.map(p => [p.BookId, p]));

    const books = await Book.findAll({
      include: [
        {
          model: AudioFile,
          attributes: ['id', 'filename', 'duration', 'trackNumber', 'format'],
          order: [['trackNumber', 'ASC'], ['filename', 'ASC']]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const enriched = books.map((b) => {
        const progress = progressMap.get(b.id);
        return {
            ...b.toJSON(),
            progress: progress?.currentTime || 0,
            lastPlayedAt: progress?.lastPlayedAt || null
        };
    });

    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Updated Scan Endpoint to accept config
app.post('/api/library/scan', async (req, res) => {
    const config = req.body || {};
    console.log('[API] Manual Scan Triggered with Config');

    scanner.scanLibrary(config).then(() => {
        io.emit('scan_complete', { time: Date.now() });
    });
    res.json({ status: 'scanning_started', message: 'Background scan started with provided configuration' });
});

app.patch('/api/book/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const payload = req.body || {};
        const book = await Book.findByPk(id);
        if (!book) return res.status(404).json({ error: 'Book not found' });

        const allowed = ['title','author','narrator','description','coverUrl','publisher','series','seriesIndex','tags','scrapeConfig','reviewNeeded','lastReviewAt'];
        const updates = {};
        for (const key of allowed) {
            if (payload[key] !== undefined) updates[key] = payload[key];
        }
        await book.update(updates);
        res.json(book.toJSON());
    } catch (e) {
        res.status(500).json({ error: 'Book update failed', detail: e.message });
    }
});

app.post('/api/book/:id/rescrape', async (req, res) => {
    const { id } = req.params;
    const { query, config = {}, base } = req.body || {};
    try {
        const book = await Book.findByPk(id);
        if (!book) return res.status(404).json({ error: 'Book not found' });

        const local = {
            title: base?.title || book.title,
            author: base?.author || book.author,
            narrator: base?.narrator || book.narrator,
        };

        const mergedConfig = { ...(book.scrapeConfig || {}), ...(config || {}) };
        const scraped = await scraper.scrape(query || local.title, local, mergedConfig);

        await book.update({
            ...scraped,
            scrapeConfig: mergedConfig,
            reviewNeeded: (scraped.scrapeConfidence || 0) < 0.8,
            lastReviewAt: new Date()
        });

        res.json(book.toJSON());
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Rescrape failed', detail: e.message });
    }
});

app.post('/api/metadata/search', async (req, res) => {
    const { query, config } = req.body || {};
    if (!query) return res.status(400).json({ error: 'query is required' });
    try {
        const results = await scraper.searchAll(query, config || {});
        res.json(results);
    } catch (e) {
        res.status(500).json({ error: 'Metadata search failed', detail: e.message });
    }
});

app.get('/api/progress', async (_req, res) => {
    try {
        const defaultUser = await User.findOne({ where: { username: 'local' } });
        const progresses = await PlaybackProgress.findAll({ where: defaultUser ? { UserId: defaultUser.id } : {} });
        res.json(progresses);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load progress', detail: e.message });
    }
});

app.post('/api/progress/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;
        const { currentTime = 0, duration = 0, isFinished = false } = req.body || {};
        const defaultUser = await User.findOne({ where: { username: 'local' } });
        const userId = defaultUser?.id;

        const [progress] = await PlaybackProgress.findOrCreate({
            where: { BookId: bookId, UserId: userId },
            defaults: { currentTime, isFinished, lastPlayedAt: new Date() }
        });

        progress.currentTime = currentTime;
        progress.isFinished = isFinished;
        progress.lastPlayedAt = new Date();
        if (duration && !Number.isNaN(duration)) progress.duration = duration;
        await progress.save();

        res.json({ status: 'ok', progress });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to save progress', detail: e.message });
    }
});

app.post('/api/metadata/rename-preview', async (req, res) => {
    const { bookId, template = '{Author} - {Title}/{TrackNumber} {SafeName}', apply = false, cleanNames = true } = req.body || {};
    if (!bookId) return res.status(400).json({ error: 'bookId is required' });

    try {
        const book = await Book.findByPk(bookId, { include: [AudioFile] });
        if (!book) return res.status(404).json({ error: 'Book not found' });

        const plan = buildRenamePlan(book, book.AudioFiles || [], template, { cleanNames });
        const summary = {
            total: plan.length,
            conflicts: plan.filter(p => p.conflict).length,
        };

        let applied = [];
        if (apply) {
            applied = applyRenamePlan(LIBRARY_PATH, plan);
            if (applied.length > 0) {
                for (const item of plan) {
                    if (item.conflict) continue;
                    const audio = await AudioFile.findByPk(item.fileId);
                    if (!audio) continue;
                    audio.path = item.to;
                    audio.filename = path.basename(item.to);
                    await audio.save();
                }
                await book.reload({ include: [AudioFile] });
            }
        }

        res.json({ plan, summary, applied });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Rename preview failed', detail: e.message });
    }
});

app.post('/api/upload', upload.array('files'), async (req, res) => {
    try {
        console.log(`[API] Received ${req.files.length} files`);
        const targetDir = req.files[0].destination;
        const book = await scanner.scanFolder(targetDir);
        res.json({ status: 'success', book });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Upload failed' });
    }
});

const PORT = 3000;
// ✅ 改动 2: 在数据库初始化并成功监听端口后，才启动 Watcher
initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`
    🚀 6uos Hear Server Ready (Pro Scraper Edition)
    -----------------------------------------------
    Port: ${PORT}
    Library Root: ${LIBRARY_PATH}
    OLED Mode:    Supported
    -----------------------------------------------
    `);
    
    // 🚦 绿灯亮起，启动监听
    startWatcher();
  });
});