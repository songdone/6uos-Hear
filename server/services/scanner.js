const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');
const ffmpeg = require('fluent-ffmpeg');
const { Book, AudioFile } = require('../database');
const scraper = require('./scraper');

// Supported extensions
const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.m4b', '.flac', '.ogg', '.wav', '.aac', '.wma', '.opus'];

class LibraryScanner {
  constructor(libraryPath) {
    this.libraryPath = libraryPath;
  }

  getMediaInfo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);
        const format = metadata.format;
        resolve({
          duration: format.duration || 0,
          format: format.format_name,
          bitrate: format.bit_rate
        });
      });
    });
  }

  // Feature: Sanitize Filenames
  sanitizeFilename(name) {
      return name.replace(/[<>:"/\\|?*]/g, '').trim();
  }

  // Feature: Check for NFO or JSON sidecar
  findSidecarMetadata(folderPath) {
      try {
          const files = fs.readdirSync(folderPath);
          const metaFile = files.find(f => f.endsWith('.nfo') || f.endsWith('.json'));
          if (!metaFile) return null;
          
          const content = fs.readFileSync(path.join(folderPath, metaFile), 'utf-8');
          // Extremely basic NFO/JSON parsing logic
          if (metaFile.endsWith('.json')) {
              return JSON.parse(content);
          } else {
              // Basic NFO regex looking for Title/Author
              const titleMatch = content.match(/Title\.*: (.*)/i);
              const authorMatch = content.match(/Author\.*: (.*)/i);
              return {
                  title: titleMatch ? titleMatch[1].trim() : null,
                  author: authorMatch ? authorMatch[1].trim() : null
              };
          }
      } catch (e) {
          console.error("Sidecar parse error", e);
          return null;
      }
  }

  async scanFolder(folderPath, config = {}) {
    const relativePath = path.relative(this.libraryPath, folderPath);
    const folderName = path.basename(folderPath);
    
    // Feature: Ignore Patterns
    if (config.ignorePatterns) {
        const patterns = config.ignorePatterns.split(',').map(s => s.trim());
        if (patterns.some(p => folderName.includes(p))) {
            console.log(`[Scanner] Ignored folder: ${folderName}`);
            return null;
        }
    }
    if (folderName.startsWith('.')) return;

    // 1. Read Dir
    let files = [];
    try {
      files = fs.readdirSync(folderPath);
    } catch (e) {
      return;
    }

    const audioCandidates = files.filter(f => AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()));
    
    // Feature: Flatten Multi-Disc (Recursive check if no files here but has subdirs like CD1)
    if (audioCandidates.length === 0 && config.flattenMultiDisc) {
        // Simple flatten logic: Scan subdirs, aggregate files. 
        // For MVP, we stick to single-level recursion or rely on existing recursive scan.
        // Returning here allows the watcher to pick up subfolders as separate books (default),
        // fixing this requires a more complex "Book Builder" that aggregates subfolders.
        // For reliability in this version, we treat leaf folders as books.
        return; 
    }
    
    if (audioCandidates.length === 0) return;

    // 2. Initial Metadata
    const firstFilePath = path.join(folderPath, audioCandidates[0]);
    let bookMeta = {
      title: folderName,
      author: 'Unknown'
    };

    // Feature: NFO Priority
    if (config.priorityNfo) {
        const sidecar = this.findSidecarMetadata(folderPath);
        if (sidecar) {
            if (sidecar.title) bookMeta.title = sidecar.title;
            if (sidecar.author) bookMeta.author = sidecar.author;
            console.log(`[Scanner] Loaded Sidecar Metadata for ${folderName}`);
        }
    }

    // ID3 Tag Fallback
    let id3Tags = null;
    try {
      id3Tags = await mm.parseFile(firstFilePath);
      if (!bookMeta.title || bookMeta.title === folderName) {
          if (id3Tags.common.album) bookMeta.title = id3Tags.common.album;
      }
      if (bookMeta.author === 'Unknown') {
          if (id3Tags.common.artist) bookMeta.author = id3Tags.common.artist;
      }

      // Feature: Extract Embedded Cover
      if (config.extractEmbeddedCover && id3Tags.common.picture && id3Tags.common.picture.length > 0) {
          const pic = id3Tags.common.picture[0];
          const coverPath = path.join(folderPath, 'cover.jpg');
          if (!fs.existsSync(coverPath)) {
              fs.writeFileSync(coverPath, pic.data);
              bookMeta.coverUrl = `/stream/cover/${relativePath}/cover.jpg`; // Needs route handler
              console.log(`[Scanner] Extracted embedded cover for ${folderName}`);
          }
      }
    } catch (e) {}

    // 3. Database Sync
    let book = await Book.findOne({ where: { folderPath: relativePath } });
    
    if (!book) {
      // Scrape
      const scrapedData = await scraper.scrape(bookMeta.title, bookMeta, config);
      
      // ✅ 改动 3: 加上 try-catch 防止并发插入时的 "Unique constraint" 报错
      try {
          book = await Book.create({
            ...scrapedData, 
            folderPath: relativePath,
            title: scrapedData.title || bookMeta.title,
            author: scrapedData.author || bookMeta.author
          });
      } catch (err) {
          if (err.name === 'SequelizeUniqueConstraintError') {
              // 🛡️ 发现撞车！优雅处理：直接读取已经存在的记录
              console.log(`[Scanner] ⚠️ Race condition detected for "${folderName}", using existing record.`);
              book = await Book.findOne({ where: { folderPath: relativePath } });
          } else {
              // 如果是其他未知错误，抛出异常
              throw err;
          }
      }
    }

    // 4. Feature: Real Renaming (Dangerous!)
    if (config.enableRenaming && config.renameTemplate && book.author !== 'Unknown') {
        // e.g. "{Author} - {Title}"
        // This is simplified. Real logic needs to handle full path moves.
        // Here we just rename the FOLDER if possible, or Files.
        // Renaming Files inside:
        // Not implemented in this safe block to prevent data loss in this environment.
        // console.log("[Scanner] Renaming skipped for safety in this environment.");
    }

    // 5. Process Tracks
    if (book) { // Ensure book exists
        await AudioFile.destroy({ where: { BookId: book.id } });
        let totalDuration = 0;
        const validAudioFiles = [];

        for (const file of audioCandidates) {
          const fullPath = path.join(folderPath, file);
          try {
            const techInfo = await this.getMediaInfo(fullPath);
            const stats = fs.statSync(fullPath);
            
            // Feature: Auto-Track Number extraction from filename if ID3 fails
            let track = 0;
            try {
                const tId3 = await mm.parseFile(fullPath);
                track = tId3.common.track.no || 0;
            } catch(e) {}
            
            if (track === 0) {
                const match = file.match(/^(\d+)/);
                if (match) track = parseInt(match[1]);
            }

            validAudioFiles.push({
              BookId: book.id,
              filename: file,
              path: path.join(relativePath, file),
              duration: techInfo.duration,
              size: stats.size,
              format: path.extname(file).substring(1),
              trackNumber: track
            });

            totalDuration += techInfo.duration;
          } catch (e) {
            console.error(`[Scanner] Bad file: ${file}`);
          }
        }

        if (validAudioFiles.length > 0) {
            await AudioFile.bulkCreate(validAudioFiles);
            await book.update({ duration: totalDuration });
            return book;
        } else {
            // If valid files are 0 but book was created, maybe keep it or delete it.
            // Keeping destruction logic from original
            await book.destroy();
            return null;
        }
    }
    return null;
  }

  async scanLibrary(config = {}) {
    console.log('[Scanner] Starting scan with config:', JSON.stringify(config));
    const scanDir = async (dir) => {
        let files = [];
        try {
            files = fs.readdirSync(dir);
        } catch (e) {
            console.error(`[Scanner] Error reading dir ${dir}:`, e.message);
            return;
        }
        
        const hasAudio = files.some(f => AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()));
        if (hasAudio) {
            await this.scanFolder(dir, config);
        }
        
        for (const file of files) {
            const fullPath = path.join(dir, file);
            // 增加 existsSync 检查防止软链失效报错
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
                await scanDir(fullPath);
            }
        }
    };
    await scanDir(this.libraryPath);
  }
}

module.exports = LibraryScanner;