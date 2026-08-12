const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

(async function(){
  try {
    const MONGO_URI = process.env.MONGODB_URI;
    if (!MONGO_URI) {
      console.error('MONGODB_URI not set in .env');
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = mongoose.connection.db;

    const FIELDS = ['avatarUrl','thumbnailUrl','courseImageUrl','imageUrl','coverImage','coverImageUrl','bannerUrl','logoUrl','profileImage','mediaUrl','resourceUrl'];

    const classify = (v) => {
      if (!v || typeof v !== 'string' || !v.trim()) return 'empty';
      const s = v.trim();
      if (s.match(/^\/uploads\//i)) return 'local_uploads';
      if (/cloudinary/i.test(s) || /res\.cloudinary\.com/i.test(s)) return 'cloudinary';
      if (/^(https?:)?\/\//i.test(s)) return 'external';
      if (s.startsWith('/')) return 'local_path';
      return 'other';
    };

    const limitSamples = 5;
    const result = { generatedAt: new Date().toISOString(), byField: {} };

    // courses.thumbnailUrl
    try {
      const coll = 'courses';
      const total = await db.collection(coll).countDocuments({ thumbnailUrl: { $exists: true, $ne: '' } });
      const docs = await db.collection(coll).find({ thumbnailUrl: { $exists: true, $ne: '' } }).limit(200).project({ thumbnailUrl: 1 }).toArray();
      const stats = { total, cloudinary: 0, local_uploads: 0, external: 0, local_path: 0, other: 0, empty: 0, samples: { cloudinary: [], local_uploads: [], external: [], local_path: [], other: [] } };
      for (const d of docs) {
        const v = d.thumbnailUrl;
        const cat = classify(v);
        if (stats[cat] !== undefined) stats[cat]++;
        if (stats.samples[cat] && stats.samples[cat].length < limitSamples) stats.samples[cat].push(v);
      }
      result.byField['courses.thumbnailUrl'] = stats;
    } catch (e) {
      result.byField['courses.thumbnailUrl'] = { error: e.message };
    }

    // users.avatarUrl
    try {
      const coll = 'users';
      const total = await db.collection(coll).countDocuments({ avatarUrl: { $exists: true, $ne: '' } });
      const docs = await db.collection(coll).find({ avatarUrl: { $exists: true, $ne: '' } }).limit(200).project({ avatarUrl: 1 }).toArray();
      const stats = { total, cloudinary: 0, local_uploads: 0, external: 0, local_path: 0, other: 0, empty: 0, samples: { cloudinary: [], local_uploads: [], external: [], local_path: [], other: [] } };
      for (const d of docs) {
        const v = d.avatarUrl;
        const cat = classify(v);
        if (stats[cat] !== undefined) stats[cat]++;
        if (stats.samples[cat] && stats.samples[cat].length < limitSamples) stats.samples[cat].push(v);
      }
      result.byField['users.avatarUrl'] = stats;
    } catch (e) {
      result.byField['users.avatarUrl'] = { error: e.message };
    }

    // other fields across all collections
    const collections = await db.listCollections().toArray();
    for (const field of FIELDS) {
      if (field === 'avatarUrl' || field === 'thumbnailUrl') continue;
      let total = 0;
      const catCounts = { cloudinary: 0, local_uploads: 0, external: 0, local_path: 0, other: 0, empty: 0 };
      const samples = { cloudinary: [], local_uploads: [], external: [], local_path: [], other: [] };
      for (const { name } of collections) {
        try {
          const q = {};
          q[field] = { $exists: true, $ne: '' };
          const cnt = await db.collection(name).countDocuments(q);
          if (!cnt) continue;
          total += cnt;
          const docs = await db.collection(name).find(q).limit(200).project({ [field]: 1 }).toArray();
          for (const d of docs) {
            const v = d[field];
            const cat = classify(v);
            if (catCounts[cat] !== undefined) catCounts[cat]++;
            if (samples[cat] && samples[cat].length < limitSamples) samples[cat].push(v);
          }
        } catch (err) {
          // ignore read errors for a collection
        }
      }
      result.byField[field] = { total, counts: catCounts, samples };
    }

    console.log(JSON.stringify(result, null, 2));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Script error:', err);
    process.exit(2);
  }
})();
