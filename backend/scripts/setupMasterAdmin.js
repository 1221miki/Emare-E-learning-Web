/**
 * setupMasterAdmin.js
 *
 * Run once against MongoDB Atlas to:
 *  1. Upsert Ayireszebene8877@gmail.com as the Master Admin
 *  2. Delete (or report) the three demo accounts:
 *       admin@emare.com / student@emare.com / instructor@emare.com
 *
 * Usage:
 *   cd backend
 *   node scripts/setupMasterAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MASTER_ADMIN_EMAIL    = 'Ayireszebene8877@gmail.com';
const MASTER_ADMIN_NAME     = 'Master Admin';
const MASTER_ADMIN_PASSWORD = 'Admin@Emare2026!';   // initial password — change after first login

const DEMO_EMAILS = [
    'admin@emare.com',
    'student@emare.com',
    'instructor@emare.com'
];

async function run() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) { console.error('❌ No MONGODB_URI in .env'); process.exit(1); }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB Atlas\n');

    const db = mongoose.connection.db;

    // ── 1. Upsert the Master Admin ───────────────────────────────────────────
    const existing = await db.collection('users').findOne({
        accountEmail: { $regex: new RegExp(`^${MASTER_ADMIN_EMAIL}$`, 'i') }
    });

    if (existing) {
        // Account already exists — ensure it is a full Admin and is active
        await db.collection('users').updateOne(
            { _id: existing._id },
            {
                $set: {
                    fullName:          MASTER_ADMIN_NAME,
                    assignedRole:      'Admin',
                    isActive:          true,
                    isEmailVerified:   true,
                    isSuspended:       false,
                    suspensionReason:  '',
                    suspensionDate:    null,
                    suspensionEndDate: null,
                    updatedAt:         new Date()
                },
                $unset: {
                    emailVerificationToken:  '',
                    emailVerificationExpire: ''
                }
            }
        );
        console.log(`✅ Master Admin already exists — role confirmed as Admin: ${MASTER_ADMIN_EMAIL}`);
        console.log('   ⚠️  Password was NOT changed (existing account).\n');
    } else {
        // First-time creation — hash and insert
        const salt   = await bcrypt.genSalt(12);
        const hashed = await bcrypt.hash(MASTER_ADMIN_PASSWORD, salt);
        await db.collection('users').insertOne({
            fullName:          MASTER_ADMIN_NAME,
            accountEmail:      MASTER_ADMIN_EMAIL,
            securedPassword:   hashed,
            assignedRole:      'Admin',
            isActive:          true,
            isSuspended:       false,
            suspensionReason:  '',
            suspensionDate:    null,
            suspensionEndDate: null,
            isEmailVerified:   true,
            gamificationPoints: 0,
            earnedBadges:      [],
            creationTimestamp: new Date(),
            updatedAt:         new Date()
        });
        console.log(`✅ Master Admin created: ${MASTER_ADMIN_EMAIL}`);
        console.log(`   Initial password:     ${MASTER_ADMIN_PASSWORD}`);
        console.log('   ⚠️  Change password immediately after first login.\n');
    }

    // ── 2. Remove demo accounts ───────────────────────────────────────────────
    for (const email of DEMO_EMAILS) {
        const user = await db.collection('users').findOne({ accountEmail: email });
        if (!user) {
            console.log(`ℹ️  Demo account not found (already removed): ${email}`);
            continue;
        }

        const userId = user._id;

        // Check for linked business data
        const [enrollments, courses, assignments, submissions, certificates, payments] = await Promise.all([
            db.collection('enrollments').countDocuments({ studentRef: userId }),
            db.collection('courses').countDocuments({ creatorRef: userId }),
            db.collection('assignments').countDocuments({ instructorRef: userId }),
            db.collection('submissions').countDocuments({ studentRef: userId }),
            db.collection('certificates').countDocuments({ studentRef: userId }),
            db.collection('transactions').countDocuments({ studentRef: userId })
        ]);

        const hasData = enrollments + courses + assignments + submissions + certificates + payments > 0;

        if (hasData) {
            // Has real business data — deactivate instead of delete to preserve integrity
            await db.collection('users').updateOne(
                { _id: userId },
                {
                    $set: {
                        isActive:    false,
                        isSuspended: true,
                        suspensionReason: 'Demo account deactivated',
                        updatedAt:   new Date()
                    }
                }
            );
            console.log(`⚠️  Demo account DEACTIVATED (has linked data): ${email}`);
            console.log(`     enrollments=${enrollments} courses=${courses} assignments=${assignments} submissions=${submissions} certificates=${certificates} payments=${payments}`);
        } else {
            // No business data — safe to delete permanently
            await db.collection('users').deleteOne({ _id: userId });
            console.log(`🗑️  Demo account DELETED permanently (no business data): ${email}`);
        }
    }

    console.log('\n✅ Done. Summary:');
    console.log(`   Master Admin : ${MASTER_ADMIN_EMAIL} (role=Admin, isActive=true)`);
    console.log('   Demo accounts: removed or deactivated (see above)');

    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
});
