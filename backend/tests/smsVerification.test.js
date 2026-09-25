const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizePhoneNumber,
  sendPhoneVerificationCode
} = require('../services/emailService');

describe('verification helpers', () => {
  test('normalizePhoneNumber converts local Ethiopian numbers to E.164 style', () => {
    assert.equal(normalizePhoneNumber('0912345678'), '+251912345678');
    assert.equal(normalizePhoneNumber('+251912345678'), '+251912345678');
  });

  test('sendPhoneVerificationCode reports a provider-missing state without crashing', async () => {
    const result = await sendPhoneVerificationCode({
      fullName: 'Demo Student',
      contactPhone: '0912345678'
    }, '123456');

    assert.ok(result && typeof result.success === 'boolean');
    assert.ok(result.message);
  });
});
