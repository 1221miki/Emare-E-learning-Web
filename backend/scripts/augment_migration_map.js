const path = require('path');
const fs = require('fs');
const glob = require('glob');
const crypto = require('crypto');

function detectMime(buf) {
  if (!buf || buf.length < 4) return 'unknown';
  const h = buf.slice(0, 16).toString('hex').toLowerCase();
  if (h.startsWith('89504e47')) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (h.startsWith('47494638')) return 'image/gif';
  if (buf.slice(0, 300).toString('utf8').includes('<svg') || buf.slice(0, 300).toString('utf8').includes('<?xml')) return 'image/svg+xml';
  return 'unknown';
}
function readFileStats(p) {
  try {
    const stat = fs.statSync(p);
    const size = stat.size;
    const buf = fs.readFileSync(p, Math.min(4096, size));
    const mime = detectMime(buf);
    const sha = size > 0 ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : '';
    return { fileExists: true, fileSizeBytes: size, mimeType: mime, sha256: sha };
  } catch (e) {
    return { fileExists: false, fileSizeBytes: 0, mimeType: '', sha256: '' };
  }
}

(async function(){
  const workspaceRoot = path.resolve(__dirname, '..', '..');
  const mapPath = path.join(workspaceRoot, 'backend', 'migration_map.json');
  let migration = [];
  if (fs.existsSync(mapPath)) migration = JSON.parse(fs.readFileSync(mapPath,'utf8'));

  const existing = new Set(migration.map(r => r.oldPathOrUrl));

  const backendUploads = path.join(workspaceRoot, 'backend', 'public', 'uploads');
  const backendPublic = path.join(workspaceRoot, 'backend', 'public');
  const clientPublic = path.join(workspaceRoot, 'client', 'public');

  const files = [];
  files.push(...glob.sync(path.join(backendUploads,'**/*.*'),{nodir:true}));
  files.push(...glob.sync(path.join(backendPublic,'**/*.*'),{nodir:true}));
  files.push(...glob.sync(path.join(clientPublic,'**/*.*'),{nodir:true}));

  for (const f of files) {
    const rel = path.relative(workspaceRoot,f).replace(/\\/g,'/');
    const key = '/' + rel;
    if (existing.has(key) || existing.has(rel)) continue;
    // only include common image types
    const ext = path.extname(f).toLowerCase();
    if (!['.png','.jpg','.jpeg','.webp','.svg'].includes(ext)) continue;

    const s = readFileStats(f);
    const isValidImage = s.fileExists && s.mimeType.startsWith('image/') && s.fileSizeBytes > 32;

    const rec = {
      oldPathOrUrl: key,
      collection: '',
      documentId: '',
      field: '',
      fileExists: s.fileExists,
      fileSizeBytes: s.fileSizeBytes,
      mimeType: s.mimeType,
      sha256: s.sha256,
      isValidImage: isValidImage,
      isReferenced: false,
      cloudinaryFolder: '',
      action: '',
      reason: '',
      expectedNewUrl: null
    };

    const basename = path.basename(f);
    if (rel.startsWith('client/public/')) {
      rec.cloudinaryFolder = 'emare_elms/frontend_assets';
      rec.action = 'manual_review';
      rec.reason = 'Frontend static asset — manual review per instructions';
    } else if (rel.startsWith('backend/public/uploads/')) {
      if (/awrs8p\.svg$/i.test(basename)) {
        // special SVG case
        rec.cloudinaryFolder = 'emare_elms/frontend_assets';
        rec.action = 'manual_review';
        rec.reason = 'SVG — validate references and usage before migrating';
      } else if (/dashboard-bg\.jpg$/i.test(basename)) {
        rec.cloudinaryFolder = 'emare_elms/frontend_assets';
        rec.action = 'manual_review';
        rec.reason = 'Frontend static asset — dashboard background';
      } else if (!s.fileExists) {
        rec.action = 'broken_reference';
        rec.reason = 'File missing on disk';
      } else if (!s.mimeType.startsWith('image/')) {
        rec.action = 'skip';
        rec.reason = 'Non-image file (exclude pdf/mp4)';
      } else if (s.fileSizeBytes <= 32) {
        rec.action = 'skip';
        rec.reason = 'Tiny/placeholder image — skip';
      } else {
        // default: migrate if referenced, else manual review
        rec.action = 'manual_review';
        rec.reason = 'Image present; check DB references before migrating';
        rec.cloudinaryFolder = 'emare_elms/frontend_assets';
      }
    } else {
      rec.action = 'manual_review';
      rec.reason = 'Unknown location — manual review';
    }

    migration.push(rec);
    existing.add(key);
  }

  // write back
  fs.writeFileSync(mapPath, JSON.stringify(migration, null, 2));
  const csvPath = path.join(workspaceRoot,'backend','migration_map.csv');
  const headers = ['oldPathOrUrl','collection','documentId','field','fileExists','fileSizeBytes','mimeType','sha256','isValidImage','isReferenced','cloudinaryFolder','action','reason','expectedNewUrl'];
  const lines = [headers.join(',')];
  for (const r of migration) {
    const row = headers.map(h => {
      const v = r[h] === null || r[h] === undefined ? '' : String(r[h]).replace(/"/g,'""');
      if (v.includes(',')||v.includes('"')||v.includes('\n')) return '"'+v+'"';
      return v;
    }).join(',');
    lines.push(row);
  }
  fs.writeFileSync(csvPath, lines.join('\n'));
  console.log('Augmented mapping written to', mapPath, csvPath);
})();
