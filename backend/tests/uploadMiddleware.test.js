const test = require('node:test');
const assert = require('node:assert/strict');
const { isAllowedMimeType } = require('../middleware/uploadMiddleware');

test('allows common document formats and extension fallbacks', () => {
  assert.equal(isAllowedMimeType('application/pdf'), true);
  assert.equal(isAllowedMimeType('image/png'), true);
  assert.equal(isAllowedMimeType('video/mp4'), true);
  assert.equal(isAllowedMimeType('application/vnd.openxmlformats-officedocument.wordprocessingml.document'), true);
  assert.equal(isAllowedMimeType('application/vnd.openxmlformats-officedocument.presentationml.presentation'), true);
  assert.equal(isAllowedMimeType('application/zip'), true);
  assert.equal(isAllowedMimeType('application/octet-stream', 'example.docx'), true);
  assert.equal(isAllowedMimeType('application/octet-stream', 'archive.zip'), true);
});

test('rejects unsupported file types', () => {
  assert.equal(isAllowedMimeType('application/x-msdownload'), false);
  assert.equal(isAllowedMimeType('application/octet-stream', 'script.exe'), false);
});
