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

const resolveInsideRoot = (libraryRoot, target) => {
  const normalizedRoot = path.resolve(libraryRoot);
  const resolved = path.resolve(normalizedRoot, target);
  const isInside = resolved === normalizedRoot || resolved.startsWith(normalizedRoot + path.sep);
  if (!isInside) {
    throw new Error(`Target escapes library root: ${target}`);
  }
  return resolved;
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
    let from, to;
    try {
      from = resolveInsideRoot(libraryRoot, item.from);
      to = resolveInsideRoot(libraryRoot, item.to);
    } catch (err) {
      // Skip unsafe paths and continue processing safe entries
      continue;
    }
    ensureDir(to);
    fs.renameSync(from, to);
    applied.push({ from: item.from, to: item.to });
  }
  return applied;
};

module.exports = { buildRenamePlan, applyRenamePlan };
