const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { after, before, mock, test } = require('node:test');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const nodemailer = require('nodemailer');

const environmentKeys = [
    'EMAIL_SERVICE',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'EMAIL_PASS',
    'EMAIL_FROM',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'JWT_SECRET',
    'NODE_ENV'
];
const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
const messages = [];
let transporterOptions;
let deliveryFailure = null;
let mongod;
let httpServer;
let baseUrl;
let authRoutes;
let errorHandler;
let User;

const postJson = async (path, payload) => {
    const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return { status: response.status, body: await response.json() };
};

const getOtp = (message) => {
    const match = String(message?.text || '').match(/verification code is:\s*(\d{6})/i);
    assert.ok(match, 'Expected the email text to contain a six-digit OTP');
    return match[1];
};

before(async () => {
    process.env.EMAIL_SERVICE = 'gmail';
    process.env.EMAIL_USER = 'smtp-user@example.com';
    process.env.EMAIL_PASSWORD = 'abcd efgh ijkl mnop';
    process.env.EMAIL_FROM = 'Emare ELMS <smtp-user@example.com>';
    process.env.JWT_SECRET = 'email-verification-test-secret';
    process.env.NODE_ENV = 'test';
    for (const key of environmentKeys) {
        if (!['EMAIL_SERVICE', 'EMAIL_USER', 'EMAIL_PASSWORD', 'EMAIL_FROM', 'JWT_SECRET', 'NODE_ENV'].includes(key)) {
            delete process.env[key];
        }
    }

    mock.method(nodemailer, 'createTransport', (options) => {
        transporterOptions = options;
        return {
            on: () => {},
            verify: async () => true,
            sendMail: async (message) => {
                messages.push(message);
                if (deliveryFailure) throw deliveryFailure;
                return { messageId: `test-message-${messages.length}` };
            }
        };
    });

    authRoutes = require('../routes/authRoutes');
    ({ errorHandler } = require('../middleware/errorHandler'));
    User = require('../models/User');
    mongod = await MongoMemoryServer.create({ instance: { startupTimeout: 60000 } });
    await mongoose.connect(mongod.getUri(), { dbName: 'email-verification-test' });

    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);
    httpServer = await new Promise((resolve) => {
        const server = app.listen(0, '127.0.0.1', () => resolve(server));
    });
    baseUrl = `http://127.0.0.1:${httpServer.address().port}/api/auth`;
});

after(async () => {
    if (httpServer) {
        await new Promise((resolve) => httpServer.close(resolve));
    }
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
    for (const [key, value] of Object.entries(originalEnvironment)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
});

test('registration, resend, expiry, verification, and login use the email OTP flow', async () => {
    assert.equal(transporterOptions.host, 'smtp.gmail.com');
    assert.equal(transporterOptions.port, 587);
    assert.equal(transporterOptions.secure, false);
    assert.equal(transporterOptions.requireTLS, true);
    assert.equal(transporterOptions.auth.user, 'smtp-user@example.com');
    assert.equal(transporterOptions.auth.pass, 'abcdefghijklmnop');

    const accountEmail = `email-flow-${Date.now()}@example.com`;
    const password = 'SecurePass1!';
    const registration = await postJson('/register', {
        fullName: 'Email Flow Student',
        accountEmail,
        securedPassword: password
    });

    assert.equal(registration.status, 201);
    assert.equal(registration.body.success, true);
    assert.equal(messages.length, 1);
    assert.deepEqual(messages[0].to, [accountEmail]);
    const firstOtp = getOtp(messages[0]);

    const createdUser = await User.findOne({ accountEmail }).select('+emailVerificationToken +emailVerificationExpire');
    assert.equal(createdUser.isEmailVerified, false);
    assert.equal(createdUser.emailVerificationToken, crypto.createHash('sha256').update(firstOtp).digest('hex'));
    assert.notEqual(createdUser.emailVerificationToken, firstOtp);
    assert.ok(createdUser.emailVerificationExpire.getTime() > Date.now());
    assert.ok(createdUser.emailVerificationExpire.getTime() <= Date.now() + (15 * 60 * 1000));

    const invalidOtp = firstOtp === '000000' ? '111111' : '000000';
    const invalidResult = await postJson('/verify-email', { accountEmail, verificationCode: invalidOtp });
    assert.equal(invalidResult.status, 400);
    assert.equal(invalidResult.body.message, 'Invalid verification code.');

    createdUser.emailVerificationExpire = new Date(Date.now() - 1000);
    await createdUser.save({ validateBeforeSave: false });
    const expiredResult = await postJson('/verify-email', { accountEmail, verificationCode: firstOtp });
    assert.equal(expiredResult.status, 400);
    assert.equal(expiredResult.body.message, 'Verification code is expired. Please request a new one.');

    const resend = await postJson('/resend-verification', { accountEmail });
    assert.equal(resend.status, 200);
    assert.equal(resend.body.success, true);
    assert.equal(messages.length, 2);
    assert.deepEqual(messages[1].to, [accountEmail]);
    const resentOtp = getOtp(messages[1]);

    const userBeforeVerification = await User.findOne({ accountEmail }).select('+emailVerificationToken +emailVerificationExpire');
    assert.equal(userBeforeVerification.emailVerificationToken, crypto.createHash('sha256').update(resentOtp).digest('hex'));
    assert.ok(userBeforeVerification.emailVerificationExpire.getTime() > Date.now());

    const verification = await postJson('/verify-email', { accountEmail, verificationCode: resentOtp });
    assert.equal(verification.status, 200);
    assert.equal(verification.body.success, true);

    const verifiedUser = await User.findOne({ accountEmail }).select('+emailVerificationToken +emailVerificationExpire');
    assert.equal(verifiedUser.isEmailVerified, true);
    assert.equal(verifiedUser.emailVerificationToken, undefined);
    assert.equal(verifiedUser.emailVerificationExpire, undefined);

    const login = await postJson('/login', { accountEmail, securedPassword: password });
    assert.equal(login.status, 200);
    assert.equal(login.body.success, true);
    assert.equal(login.body.data.accountEmail, accountEmail);

    const resendAfterVerification = await postJson('/resend-verification', { accountEmail });
    assert.equal(resendAfterVerification.status, 400);
    assert.equal(resendAfterVerification.body.success, false);

    const failedEmail = `email-failure-${Date.now()}@example.com`;
    deliveryFailure = Object.assign(new Error('SMTP unavailable'), { code: 'EUNAVAILABLE' });
    const failedRegistration = await postJson('/register', {
        fullName: 'Failed Delivery Student',
        accountEmail: failedEmail,
        securedPassword: password
    });
    assert.equal(failedRegistration.status, 502);
    assert.equal(failedRegistration.body.success, false);
    assert.equal(failedRegistration.body.message, 'Unable to send verification email. Please try again.');
    assert.equal(await User.exists({ accountEmail: failedEmail }), null);
    deliveryFailure = null;
});
