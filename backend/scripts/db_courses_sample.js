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

    const total = await db.collection('courses').countDocuments();
    const docs = await db.collection('courses').find({}).limit(5).toArray();

    const urlLike = (v) => {
      if (!v || typeof v !== 'string') return false;
      return /^(https?:)?\/\//i.test(v) || /^\/uploads\//i.test(v) || /cloudinary|res\.cloudinary\.com/i.test(v);
    };

    const inspectDoc = (doc) => {
      const res = { _id: doc._id, courseTitle: doc.courseTitle || doc.courseTitle, thumbnailUrl: doc.thumbnailUrl || '', otherUrlFields: {} };
      const stack = [{key:'', val:doc}];
      while(stack.length){
        const {key, val} = stack.pop();
        if(val && typeof val === 'object'){
          for(const k of Object.keys(val)){
            try{
              const v = val[k];
              const compound = key ? `${key}.${k}` : k;
              if(typeof v === 'string'){
                if(urlLike(v)) res.otherUrlFields[compound] = v;
              } else if(Array.isArray(v)){
                v.forEach((item, idx)=>{ if(typeof item === 'string'){ if(urlLike(item)) res.otherUrlFields[`${compound}[${idx}]`] = item } else if(typeof item==='object'){ stack.push({key:`${compound}[${idx}]`, val:item}); } });
              } else if(typeof v === 'object' && v !== null){
                stack.push({key:compound, val:v});
              }
            }catch(e){}
          }
        }
      }
      return res;
    };

    const samples = docs.map(inspectDoc);

    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), totalCourses: total, sampleCount: samples.length, samples }, null, 2));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Script error:', err);
    process.exit(2);
  }
})();
