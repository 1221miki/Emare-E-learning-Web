const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  filename: { type: String },
  mimeType: { type: String },
  source: { type: String, enum: ['bunny', 'cloudinary', 'local'], default: 'bunny' },
  bunnyType: { type: String, enum: ['video', 'storage'], required: false },
  url: { type: String },
  storagePath: { type: String },
  guid: { type: String },
  publicId: { type: String },
  libraryId: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
}, { timestamps: true });

module.exports = mongoose.model('Media', MediaSchema);
