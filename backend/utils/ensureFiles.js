const fs = require('fs');
const path = require('path');

function ensureFile(filePath, content) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content, { encoding: 'utf8' });
      console.log(`✔️ Created missing file: ${filePath}`);
    }
  } catch (err) {
    console.error(`Failed to ensure file ${filePath}:`, err);
  }
}

const base = path.join(__dirname, '..');

// Ensure chapaService exists (wrapper that re-exports chapaAdapter if available)
ensureFile(path.join(base, 'services', 'chapaService.js'), `let chapaAdapter = null;
try {
  chapaAdapter = require('./chapaAdapter');
} catch (err) {}

if (chapaAdapter && typeof chapaAdapter === 'object') {
  module.exports = chapaAdapter;
} else {
  module.exports = {
    initialize: async () => { throw new Error('chapaService: chapaAdapter not found'); },
    verify: async () => { throw new Error('chapaService: chapaAdapter not found'); }
  };
}
`);

// Ensure Payment model exists
ensureFile(path.join(base, 'models', 'Payment.js'), `const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    transactionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    tx_ref: { type: String, trim: true, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'ETB' },
    paymentMethod: { type: String, enum: ['cbe', 'telebirr', 'chapa', 'dashen', 'other'], default: 'chapa' },
    providerTransactionId: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['Pending', 'Completed', 'Failed', 'Cancelled'], default: 'Pending' },
    metadata: { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
`);

module.exports = { ensureFile };
