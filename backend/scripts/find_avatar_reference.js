const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const glob = require('glob');

const TARGET = 'file_1786180740737_gta6i5.png';
(async function(){
  const MONGO_URI = process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;

  const result = { foundInDb: [], userDoc: null, collectionsSearched: [] };

  try {
    // find any user with this avatarUrl
    const users = await db.collection('users').find({ avatarUrl: { $regex: TARGET } }).toArray();
    if (users && users.length>0) {
      result.userDoc = users[0];
      result.foundInDb.push({ collection: 'users', docId: users[0]._id ? users[0]._id.toString() : '', field: 'avatarUrl', value: users[0].avatarUrl });
    }

    // search all collections for string occurrences in any string fields (simple scan)
    const cols = await db.listCollections().toArray();
    for (const { name } of cols) {
      try {
        const docs = await db.collection(name).find({ $or: [ { avatarUrl: { $regex: TARGET } }, { thumbnailUrl: { $regex: TARGET } }, { imageUrl: { $regex: TARGET } }, { coverImage: { $regex: TARGET } }, { logoUrl: { $regex: TARGET } } ] }).limit(100).toArray();
        if (docs && docs.length>0) {
          for (const d of docs) result.foundInDb.push({ collection: name, docId: d._id ? d._id.toString() : '', snippet: d });
        }
        result.collectionsSearched.push(name);
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    result.dbError = String(e.message || e);
  }

  // filesystem search for filename
  const workspaceRoot = path.resolve(__dirname, '..', '..');
  const searchPaths = ['backend', 'client', 'public', 'src', 'backup', 'tmp', 'scratch'];
  result.fsMatches = [];
  for (const sp of searchPaths) {
    try {
      const files = glob.sync(path.join(workspaceRoot, sp, '**', '*'), { nodir: true, nocase: true });
      for (const f of files) {
        const base = path.basename(f);
        if (base.toLowerCase() === TARGET.toLowerCase()) result.fsMatches.push(path.relative(workspaceRoot, f).replace(/\\/g, '/'));
      }
    } catch (e) {}
  }

  // search file contents for occurrences
  result.contentMatches = [];
  const allFiles = glob.sync(path.join(workspaceRoot, '**', '*.*'), { nodir: true, ignore: ['**/node_modules/**','**/.git/**'] });
  for (const f of allFiles) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      if (content && content.indexOf(TARGET) !== -1) result.contentMatches.push(path.relative(workspaceRoot, f).replace(/\\/g, '/'));
    } catch (e) {}
  }

  // check if any file with that name exists under common locations
  result.existsAnywhere = result.fsMatches.length > 0;

  // check if user has other avatar-like fields
  if (result.userDoc) {
    const user = result.userDoc;
    const otherAvatarFields = ['avatarUrl','profileImage','image','photo','picture','avatar'];
    result.userOtherImageFields = {};
    for (const f of otherAvatarFields) {
      if (user[f]) result.userOtherImageFields[f] = user[f];
    }
    result.accountEmail = user.email || user.username || null;
    result.userId = user._id ? user._id.toString() : null;
  }

  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
  process.exit(0);
})();
