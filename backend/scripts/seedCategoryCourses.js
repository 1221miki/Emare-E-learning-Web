require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), override: true });
const mongoose = require('mongoose');
const { seedCategoryCoursesHelper } = require('../utils/seedHelper');

const runSeed = async () => {
    const urisToTry = [
        process.env.MONGODB_URI,
        'mongodb://127.0.0.1:27017/emare-elms',
        'mongodb://localhost:27017/emare-elms'
    ].filter(Boolean);

    let connected = false;

    for (const uri of urisToTry) {
        try {
            console.log(`Connecting to MongoDB at: ${uri.split('@').pop()}...`);
            await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
            console.log(`🔗 Connected successfully to: ${uri.split('@').pop()}`);
            connected = true;
            break;
        } catch (err) {
            console.warn(`⚠️ Connection to ${uri.split('@').pop()} failed (${err.message}). Trying next...`);
        }
    }

    if (!connected) {
        console.log('🔄 Starting MongoMemoryServer as fallback...');
        try {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            const mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
            const memoryUri = mongod.getUri();
            await mongoose.connect(memoryUri);
            console.log('✅ Connected to In-Memory MongoDB.');
            connected = true;
        } catch (memErr) {
            console.error('❌ Failed to connect to any MongoDB server:', memErr.message);
            process.exit(1);
        }
    }

    await seedCategoryCoursesHelper();
    console.log('🎉 Seeding finished successfully!');
    process.exit(0);
};

runSeed();
