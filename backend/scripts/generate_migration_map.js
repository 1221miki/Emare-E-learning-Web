const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const glob = require('glob');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

function detectMime(buf) {
  if (!buf || buf.length < 4) return 'unknown';
  const h = buf.slice(0, 16).toString('hex').toLowerCase();
  if (h.startsWith('89504e47')) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (h.startsWith('47494638')) return 'image/gif';
  if (buf.slice(0, 300).toString('utf8').includes('<svg') || buf.slice(0, 300).toString('utf8').includes('<?xml')) return 'image/svg+xml';
  if (buf.slice(0,4).toString()==='%PDF') return 'application/pdf';
  if (buf.slice(4,8).toString()==='ftyp') return 'video/mp4';
  return 'unknown';
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
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

async function main() {
  const MONGO_URI = process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.error('MONGODB_URI not set in .env; aborting.');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;

  const workspaceRoot = path.resolve(__dirname, '..', '..');
  const backendUploads = path.join(workspaceRoot, 'backend', 'public', 'uploads');
  const backendPublic = path.join(workspaceRoot, 'backend', 'public');
  const clientPublic = path.join(workspaceRoot, 'client', 'public');

  // gather filesystem candidate image files (only common image extensions + svg)
  const fsCandidates = new Set();
  const patterns = [
    path.join(backendUploads, '**/*.{png,jpg,jpeg,webp,svg}'),
    path.join(backendPublic, '**/*.{png,jpg,jpeg,webp,svg}'),
    path.join(clientPublic, '**/*.{png,jpg,jpeg,webp,svg}'),
  ];
  for (const pat of patterns) {
    const found = glob.sync(pat, { nodir: true });
    for (const f of found) fsCandidates.add(path.resolve(f));
  }

  // helper to normalize local upload path from '/uploads/...' or 'http://host/uploads/...'
  function localPathFromUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const m = url.match(/uploads\/([^\s"']+)$/i);
    if (m) return path.join(backendUploads, m[1]);
    // also handle absolute /uploads/... paths
    const m2 = url.match(/^\/uploads\/(.+)$/i);
    if (m2) return path.join(backendUploads, m2[1]);
    return null;
  }

  const migration = [];

  // scan DB for fields that reference images
  const collections = await db.listCollections().toArray();
  const candidateUrlRegex = /(uploads\/[^"'\s]+)|(res\.cloudinary\.com)|(via\.placeholder\.com)|(i\.pravatar\.cc)/i;

  for (const { name } of collections) {
    try {
      const cursor = db.collection(name).find({}, { projection: { } }).batchSize(200);
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        const id = doc._id ? (doc._id.toString()) : '';
        for (const key of Object.keys(doc)) {
          const val = doc[key];
          if (!val || typeof val !== 'string') continue;
          if (!candidateUrlRegex.test(val)) continue;

          const rec = {
            oldPathOrUrl: val,
            collection: name,
            documentId: id,
            field: key,
            fileExists: false,
            fileSizeBytes: 0,
            mimeType: '',
            sha256: '',
            isValidImage: false,
            isReferenced: true,
            cloudinaryFolder: '',
            action: '',
            reason: '',
            expectedNewUrl: null
          };

          if (/res\.cloudinary\.com/i.test(val)) {
            rec.action = 'already_cloudinary';
            rec.isValidImage = true;
            rec.mimeType = 'image/*';
            rec.reason = 'DB value is a Cloudinary URL';
            // recommend folder by field
            if (/thumbnail/i.test(key) || /course/i.test(name)) rec.cloudinaryFolder = 'emare_elms/course_thumbnails';
            else if (/avatar/i.test(key) || /user/i.test(name)) rec.cloudinaryFolder = 'emare_elms/avatars';
            else rec.cloudinaryFolder = 'emare_elms/frontend_assets';
            migration.push(rec);
            continue;
          }

          if (/via\.placeholder\.com|i\.pravatar\.cc/i.test(val)) {
            rec.action = 'skip';
            rec.reason = 'Placeholder external URL';
            rec.cloudinaryFolder = '';
            migration.push(rec);
            continue;
          }

          // local uploads path
          const local = localPathFromUrl(val);
          if (local) {
            const stats = readFileStats(local);
            rec.fileExists = !!stats.fileExists;
            rec.fileSizeBytes = stats.fileSizeBytes;
            rec.mimeType = stats.mimeType;
            rec.sha256 = stats.sha256;
            rec.isValidImage = stats.fileExists && stats.mimeType.startsWith('image/') && stats.fileSizeBytes > 32;
            // decide action
            if (!stats.fileExists) {
              rec.action = 'broken_reference';
              rec.reason = 'DB references a /uploads/ file that does not exist on disk';
            } else if (!stats.mimeType.startsWith('image/')) {
              rec.action = 'skip';
              rec.reason = 'Referenced file is not an image (mime=' + stats.mimeType + ')';
            } else if (stats.fileSizeBytes <= 32) {
              rec.action = 'skip';
              rec.reason = 'File is extremely small/likely placeholder or invalid';
            } else {
              // valid image file
              // recommend folder
              if (name === 'courses' || /thumbnail/i.test(key)) rec.cloudinaryFolder = 'emare_elms/course_thumbnails';
              else if (name === 'users' || /avatar/i.test(key)) rec.cloudinaryFolder = 'emare_elms/avatars';
              else rec.cloudinaryFolder = 'emare_elms/frontend_assets';
              rec.action = 'migrate';
              rec.reason = 'Local image file present and referenced by DB';
            }
            migration.push(rec);
            // ensure the file itself is in fsCandidates to process later if unreferenced
            if (stats.fileExists) fsCandidates.add(path.resolve(local));
            continue;
          }

          // other external URLs containing uploads segment but not matching patterns
          rec.action = 'manual_review';
          rec.reason = 'External URL requires manual review';
          migration.push(rec);
        }
      }
    } catch (e) {
      // ignore collection read errors
    }
  }

  // For each filesystem candidate, determine references in DB or source files
  const allSourceFiles = glob.sync('**/*.*', { nodir: true, ignore: ['node_modules/**', '.git/**', 'backend/node_modules/**', 'client/node_modules/**', 'backend/public/uploads/**/'] });

  for (const absPath of Array.from(fsCandidates)) {
    const relFromWorkspace = path.relative(workspaceRoot, absPath).replace(/\\/g, '/');
    // find DB references already recorded
    const already = migration.filter(r => r.oldPathOrUrl === relFromWorkspace || r.oldPathOrUrl === ('/'+relFromWorkspace) || (r.fileExists && r.fileSizeBytes>0 && r.sha256 && r.sha256===readFileStats(absPath).sha256));
    if (already.length > 0) continue; // already handled via DB references

    const stats = readFileStats(absPath);
    const rec = {
      oldPathOrUrl: '/' + relFromWorkspace,
      collection: '',
      documentId: '',
      field: '',
      fileExists: stats.fileExists,
      fileSizeBytes: stats.fileSizeBytes,
      mimeType: stats.mimeType,
      sha256: stats.sha256,
      isValidImage: stats.fileExists && stats.mimeType.startsWith('image/') && stats.fileSizeBytes > 32,
      isReferenced: false,
      cloudinaryFolder: '',
      action: '',
      reason: '',
      expectedNewUrl: null
    };

    // search source files for filename or relative path occurrences
    const basename = path.basename(absPath);
    const searchRegex = new RegExp(basename.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
    for (const sf of allSourceFiles) {
      try {
        const content = fs.readFileSync(sf, 'utf8');
        if (searchRegex.test(content)) {
          rec.isReferenced = true;
          break;
        }
      } catch (e) { }
    }

    // special-case frontend static
    if (relFromWorkspace.startsWith('client/public/')) {
      rec.cloudinaryFolder = 'emare_elms/frontend_assets';
      rec.action = 'manual_review';
      rec.reason = 'Frontend static asset — review before migrating';
    } else if (relFromWorkspace.startsWith('backend/public/uploads/')) {
      // recommend by filename: if contains 'thumbnail' or used in courses, choose thumbnail folder
      if (/thumbnail/i.test(basename)) rec.cloudinaryFolder = 'emare_elms/course_thumbnails';
      else if (/avatar/i.test(basename)) rec.cloudinaryFolder = 'emare_elms/avatars';
      else rec.cloudinaryFolder = 'emare_elms/frontend_assets';
      if (!rec.fileExists) {
        rec.action = 'broken_reference';
        rec.reason = 'File missing on disk';
      } else if (!rec.mimeType.startsWith('image/')) {
        rec.action = 'skip';
        rec.reason = 'Non-image file';
      } else if (rec.fileSizeBytes <= 32) {
        rec.action = 'skip';
        rec.reason = 'Tiny/placeholder image — skip';
      } else {
        rec.action = rec.isReferenced ? 'migrate' : 'manual_review';
        rec.reason = rec.isReferenced ? 'Image file present; migrate when approved' : 'Image file not found referenced in DB; manual review';
      }
    } else {
      rec.action = 'manual_review';
      rec.reason = 'Unknown location — manual review';
    }

    migration.push(rec);
  }

  // Write outputs
  const outJsonPath = path.join(workspaceRoot, 'backend', 'migration_map.json');
  const outCsvPath = path.join(workspaceRoot, 'backend', 'migration_map.csv');
  fs.writeFileSync(outJsonPath, JSON.stringify(migration, null, 2));

  // CSV header
  const headers = [
    'oldPathOrUrl','collection','documentId','field','fileExists','fileSizeBytes','mimeType','sha256','isValidImage','isReferenced','cloudinaryFolder','action','reason','expectedNewUrl'
  ];
  const lines = [headers.join(',')];
  for (const r of migration) {
    const row = headers.map(h => {
      let v = r[h];
      if (v === null || v === undefined) return '';
      // escape quotes
      const s = String(v).replace(/"/g, '""');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s + '"';
      return s;
    }).join(',');
    lines.push(row);
  }
  fs.writeFileSync(outCsvPath, lines.join('\n'));

  console.log('Wrote', outJsonPath, outCsvPath);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(2); });
