const mongoose = require('mongoose');

/**
 * Test whether the current mongoose connection supports write operations.
 * The Atlas SQL endpoint (query.mongodb.net) is read-only and rejects all writes.
 * We ping with a lightweight insertOne + deleteOne to confirm write access.
 */
async function canWrite() {
    try {
        const db = mongoose.connection.db;
        const col = db.collection('__write_test__');
        const result = await col.insertOne({ _writeTest: true, ts: new Date() });
        await col.deleteOne({ _id: result.insertedId });
        return true;
    } catch {
        return false;
    }
}

const connectDB = async () => {
    const configuredUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/emare-elms';

    // ── 1. Try the configured URI ──────────────────────────────────────────────
    try {
        const conn = await mongoose.connect(configuredUri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Check if this endpoint actually supports writes
        const writable = await canWrite();
        if (!writable) {
            console.error('❌ Connected MongoDB endpoint is read-only (Atlas SQL / Data Federation).');
            console.error('   Writes are not supported on this endpoint.');
            if (process.env.USE_IN_MEMORY_DB === 'true') {
                console.warn('🔄 Falling back to In-Memory MongoDB because USE_IN_MEMORY_DB=true.');
                await mongoose.disconnect();
                throw new Error('READ_ONLY_ENDPOINT');
            }
            console.error('❌ Aborting startup because this database cannot persist registered users.');
            process.exit(1);
        }

        await seedDefaultData();
        return;
    } catch (err) {
        if (err.message !== 'READ_ONLY_ENDPOINT') {
            console.warn(`⚠️  Could not connect to configured MongoDB: ${err.message}`);
        }
        if (process.env.USE_IN_MEMORY_DB === 'true') {
            console.log('🔄 Starting In-Memory MongoDB for development...');
        } else {
            console.error('❌ No writable MongoDB available. Set a valid MONGODB_URI or enable USE_IN_MEMORY_DB=true for local development.');
            process.exit(1);
        }
    }

    // ── 2. Fallback: mongodb-memory-server ────────────────────────────────────
    try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create({
            instance: { launchTimeout: 60000 },
        });
        const memoryUri = mongod.getUri();

        const conn = await mongoose.connect(memoryUri);
        console.log(`✅ In-Memory MongoDB Connected: ${conn.connection.host}`);
        console.log('ℹ️  Note: Data will not persist between restarts (in-memory mode).');

        await seedDefaultData();
    } catch (memErr) {
        console.error(`❌ Failed to start In-Memory MongoDB: ${memErr.message}`);
        process.exit(1);
    }
};

// ── Seed default accounts & category courses ──────────────────────────────────
async function seedDefaultData() {
    const User = require('../models/User');
    const bcrypt = require('bcryptjs');

    async function upsertUser(label, email, plainPassword, role) {
        try {
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(plainPassword, salt);

            const existing = await User.findOne({ accountEmail: email });
            if (existing) {
                // Use native driver updateOne — bypasses any problematic Mongoose internals
                await User.collection.updateOne(
                    { accountEmail: email },
                    {
                        $set: {
                            fullName: label,
                            securedPassword: hashed,
                            assignedRole: role,
                            isActive: true,
                            isSuspended: false,
                            suspensionReason: '',
                            suspensionDate: null,
                            suspensionEndDate: null,
                            isEmailVerified: true,
                            emailVerificationToken: undefined,
                            emailVerificationExpire: undefined,
                        }
                    }
                );
                console.log(`🔒 Default ${role.toLowerCase()} enforced: ${email} / ${plainPassword}`);
            } else {
                await User.collection.insertOne({
                    fullName: label,
                    accountEmail: email,
                    securedPassword: hashed,
                    assignedRole: role,
                    isActive: true,
                    isSuspended: false,
                    suspensionReason: '',
                    suspensionDate: null,
                    suspensionEndDate: null,
                    isEmailVerified: true,
                    creationTimestamp: new Date(),
                    updatedAt: new Date(),
                });
                console.log(`👤 Default ${role.toLowerCase()} created: ${email} / ${plainPassword}`);
            }
        } catch (err) {
            console.warn(`⚠️  Could not seed ${role} (${email}): ${err.message}`);
        }
    }

    // Seed the three default accounts
    await upsertUser('Admin User',      'admin@emare.com',      'admin12345',      'Admin');
    await upsertUser('Demo Student',    'student@emare.com',    'student12345',    'Student');
    await upsertUser('Demo Instructor', 'instructor@emare.com', 'instructor12345', 'Instructor');
    console.log('✅ Default data seeded successfully.');

    // Seed category courses (non-fatal)
    try {
        const { seedCategoryCoursesHelper } = require('../utils/seedHelper');
        await seedCategoryCoursesHelper();
    } catch (err) {
        console.warn(`⚠️  Could not seed category courses: ${err.message}`);
    }
}

module.exports = connectDB;
