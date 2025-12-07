const fs = require('fs');
const path = require('path');

const sanitize = (value = '') => value.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();

const formatTemplate = (template, payload) => {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = payload[key];
    if (val === undefined || val === null) return '';
    return sanitize(String(val));
  });
};

const ensureDir = (targetPath) => {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const buildRenamePlan = (book, audioFiles, template, options = {}) => {
  const cleanNames = options.cleanNames ?? true;
  const plan = [];

  audioFiles.forEach((file, idx) => {
    const trackNumber = file.trackNumber || idx + 1;
    const ext = path.extname(file.filename);
    const safeTitle = sanitize(path.basename(file.filename, ext));

    const payload = {
      Title: book.title,
      Author: book.author,
      Narrator: book.narrator,
      Series: book.series,
      SeriesIndex: book.seriesIndex,
      TrackNumber: trackNumber.toString().padStart(2, '0'),
      SafeName: cleanNames ? safeTitle : path.basename(file.filename, ext),
      Ext: ext.replace('.', '')
    };

    const relativeTarget = formatTemplate(template, payload) || `${payload.TrackNumber}-${payload.SafeName}`;
    const resolvedTarget = relativeTarget.endsWith(`.${payload.Ext}`)
      ? relativeTarget
      : `${relativeTarget}.${payload.Ext || 'mp3'}`;

    const current = file.path;
    const targetPath = path.join(book.folderPath || '', resolvedTarget);

    plan.push({
      fileId: file.id,
      from: current,
      to: targetPath,
      conflict: current === targetPath
    });
  });

  // Detect intra-plan conflicts
  const targetMap = new Map();
  plan.forEach((p) => {
    const key = p.to.toLowerCase();
    p.conflict = p.conflict || targetMap.has(key);
    targetMap.set(key, true);
  });

  return plan;
};

const applyRenamePlan = (libraryRoot, plan) => {
  const applied = [];
  for (const item of plan) {
    if (item.conflict) continue;
    const from = path.join(libraryRoot, item.from);
    const to = path.join(libraryRoot, item.to);
    ensureDir(to);
    fs.renameSync(from, to);
    applied.push({ from: item.from, to: item.to });
  }
  return applied;
};

module.exports = { buildRenamePlan, applyRenamePlan };
