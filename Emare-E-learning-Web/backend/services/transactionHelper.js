const mongoose = require('mongoose');

let _supportsTransactions = null;

async function checkSupport() {
    if (_supportsTransactions !== null) return _supportsTransactions;
    try {
        const enabled = String(process.env.MONGODB_TRANSACTIONS_ENABLED || 'false').toLowerCase() === 'true';
        if (!enabled) {
            _supportsTransactions = false;
            return _supportsTransactions;
        }

        const admin = mongoose.connection.db.admin();
        // Use hello or isMaster to detect replica set name / logical session support
        const info = await admin.command({ hello: 1 }).catch(async () => await admin.command({ isMaster: 1 }));
        // logicalSessionTimeoutMinutes present indicates sessions supported
        const supports = Boolean(info && (info.logicalSessionTimeoutMinutes || info.setName));
        _supportsTransactions = supports;
        return _supportsTransactions;
    } catch (err) {
        _supportsTransactions = false;
        return _supportsTransactions;
    }
}

async function getSessionIfPossible() {
    const supported = await checkSupport();
    if (!supported) return null;
    try {
        const session = await mongoose.startSession();
        return session;
    } catch (err) {
        return null;
    }
}

module.exports = { checkSupport, getSessionIfPossible };
