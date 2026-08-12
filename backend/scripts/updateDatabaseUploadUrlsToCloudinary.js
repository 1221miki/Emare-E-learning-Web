const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '../..', '.env') });

const SOURCE_MAPPING_FILE = path.join(__dirname, 'public_uploads_cloudinary_map.json');
const BACKUP_FILE = path.join(__dirname, `db_backup_upload_url_matches_${Date.now()}.json`);
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emare-elms';
const LOCAL_UPLOAD_PREFIX = '/uploads/';

const FIELDS_TO_CHECK = [
  'avatarUrl',
  'thumbnailUrl',
  'courseImageUrl',
  'imageUrl',
  'coverImage',
  'coverImageUrl',
  'bannerUrl',
  'logoUrl',
  'profileImage',
  'mediaUrl',
  'resourceUrl'
];

const normalizePath = (value) => {
  if (!value || typeof value !== 'string') return null;
  let normalized = value.trim();
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    try {
      const url = new URL(normalized);
      normalized = url.pathname;
    } catch (err) {
      // Ignore URL parse failure, keep raw string.
    }
  }
  if (normalized.startsWith(LOCAL_UPLOAD_PREFIX)) {
    normalized = normalized.slice(LOCAL_UPLOAD_PREFIX.length);
  }
  normalized = normalized.replace(/^\/+/, '').replace(/\\/g, '/');
  return normalized.toLowerCase();
};

const loadMapping = async () => {
  if (!fs.existsSync(SOURCE_MAPPING_FILE)) {
    throw new Error(`Mapping file not found: ${SOURCE_MAPPING_FILE}`);
  }
  const raw = await fs.promises.readFile(SOURCE_MAPPING_FILE, 'utf8');
  const list = JSON.parse(raw);
  const map = new Map();
  for (const item of list) {
    if (item.localPath && item.secure_url) {
      const normalized = item.localPath.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
      map.set(normalized, item.secure_url);
    }
  }
  return map;
};

const backupAndUpdateCollection = async (db, collectionName, mapping, results) => {
  const collection = db.collection(collectionName);
  const query = {
    $or: FIELDS_TO_CHECK.map((field) => ({ [field]: { $regex: `^${LOCAL_UPLOAD_PREFIX.replace('/', '\/')}`, $options: 'i' } }))
  };

  const docs = await collection.find(query).toArray();
  if (!docs.length) return;

  const matchedDocs = [];
  for (const doc of docs) {
    const updates = {};
    const changes = [];

    for (const field of FIELDS_TO_CHECK) {
      const value = doc[field];
      if (!value || typeof value !== 'string') continue;
      const normalized = normalizePath(value);
      if (!normalized || !mapping.has(normalized)) continue;
      const newUrl = mapping.get(normalized);
      if (newUrl && newUrl !== value) {
        updates[field] = newUrl;
        changes.push({ field, oldValue: value, newValue: newUrl });
      }
    }

    if (changes.length) {
      matchedDocs.push({ _id: doc._id, collection: collectionName, changes, doc });
      await collection.updateOne({ _id: doc._id }, { $set: updates });
      results.updatedCount += 1;
    }
  }

  if (matchedDocs.length) {
    await fs.promises.writeFile(BACKUP_FILE, JSON.stringify({ updatedAt: new Date().toISOString(), collection: collectionName, matches: matchedDocs }, null, 2), 'utf8');
    results.collectionsUpdated.push(collectionName);
    results.matches.push({ collection: collectionName, count: matchedDocs.length });
  }
};

const run = async () => {
  console.log('Loading Cloudinary mapping...');
  const mapping = await loadMapping();
  console.log(`Loaded ${mapping.size} mapped upload paths.`);

  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const results = { updatedCount: 0, collectionsUpdated: [], matches: [] };

  console.log('Creating database backup and updating matched URLs...');
  for (const { name } of collections) {
    try {
      await backupAndUpdateCollection(db, name, mapping, results);
    } catch (err) {
      console.error(`Error processing collection ${name}:`, err.message || err);
    }
  }

  console.log('Update complete.');
  console.log(`Collections updated: ${results.collectionsUpdated.join(', ') || 'None'}`);
  console.log(`Total documents updated: ${results.updatedCount}`);
  console.log(`Backup written to: ${BACKUP_FILE}`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Script failed:', err.message || err);
  process.exit(1);
});
