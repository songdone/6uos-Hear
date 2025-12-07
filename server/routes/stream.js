
const express = require('express');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { AudioFile, Book } = require('../database');

const router = express.Router();
const LIBRARY_ROOT = process.env.LIBRARY_PATH || './mnt/library';

// Helper to get full path
const getFullPath = (relPath) => path.join(LIBRARY_ROOT, relPath);

router.get('/:fileId', async (req, res) => {
  const { fileId } = req.params;
  const { transcode } = req.query; // ?transcode=1 to force mp3

  try {
    const fileRecord = await AudioFile.findByPk(fileId);
    if (!fileRecord) return res.status(404).send('File not found');

    const filePath = getFullPath(fileRecord.path);
    if (!fs.existsSync(filePath)) return res.status(404).send('Physical file missing');

    const ext = path.extname(filePath).toLowerCase();
    const needsTranscode = transcode === '1' || ['.m4b', '.flac', '.ogg', '.wma'].includes(ext);

    // --- Transcoding Mode (ffmpeg) ---
    if (needsTranscode) {
      // Basic FFmpeg stream. Note: Seeking in transcoded streams is complex (requires calculating byte offset).
      // For this MVP, we stream from start or specific time if start_time is provided (HLS is better for this).
      
      console.log(`[Stream] Transcoding ${fileRecord.filename} to MP3`);
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked'
      });

      const command = ffmpeg(filePath)
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .format('mp3')
        .on('error', (err) => {
           if (err.message !== 'Output stream closed') console.error('FFmpeg error:', err);
        });

      // If user requested a specific start time (e.g., for simple seeking in transcoded stream)
      // ?t=120 (seconds)
      if (req.query.t) {
        command.setStartTime(parseInt(req.query.t));
      }

      command.pipe(res, { end: true });
      return;
    }

    // --- Direct Streaming Mode (HTTP Range) ---
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': `audio/${ext.substring(1) === 'mp3' ? 'mpeg' : ext.substring(1)}`,
      };
      
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': `audio/${ext.substring(1) === 'mp3' ? 'mpeg' : ext.substring(1)}`,
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }

  } catch (e) {
    console.error(e);
    res.status(500).send('Stream Error');
  }
});

module.exports = router;
