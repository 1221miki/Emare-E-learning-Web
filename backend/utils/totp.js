const crypto = require('crypto');

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Base32 (RFC 4648) encode a Buffer.
 * Returns uppercase base32 without padding.
 */
const base32Encode = (buffer) => {
    let bits = 0;
    let value = 0;
    let output = '';
    for (let i = 0; i < buffer.length; i++) {
        value = (value << 8) | buffer[i];
        bits += 8;
        while (bits >= 5) {
            output += B32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        output += B32_ALPHABET[(value << (5 - bits)) & 31];
    }
    return output;
};

/**
 * Base32 (RFC 4648) decode a string.
 * Accepts uppercase/lowercase and ignores spaces/hyphens.
 */
const base32Decode = (input) => {
    const clean = String(input).toUpperCase().replace(/[\s-]/g, '');
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (let i = 0; i < clean.length; i++) {
        const idx = B32_ALPHABET.indexOf(clean[i]);
        if (idx === -1) throw new Error('Invalid base32 character');
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
};

/**
 * Generate a random base32 secret (20 random bytes, 32 chars).
 */
const generateSecret = () => base32Encode(crypto.randomBytes(20));

/**
 * Compute a TOTP code for a given secret and timestamp (RFC 6238, SHA-1, 6 digits, 30s step).
 */
const generateTOTP = (secret, timestamp = Date.now(), timeStep = 30, digits = 6) => {
    const counter = Math.floor(timestamp / 1000 / timeStep);
    const msg = Buffer.alloc(8);
    msg.writeBigUInt64BE(BigInt(counter));
    const key = base32Decode(secret);
    const hmac = crypto.createHmac('sha1', key).update(msg).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
    const otp = binary % Math.pow(10, digits);
    return String(otp).padStart(digits, '0');
};

/**
 * Verify a TOTP code allowing +/- window steps for clock drift.
 */
const verifyTOTP = (secret, token, window = 1) => {
    if (!secret || !token) return false;
    const input = String(token).replace(/\s+/g, '');
    if (!/^\d{6}$/.test(input)) return false;
    const now = Date.now();
    for (let i = -window; i <= window; i++) {
        if (generateTOTP(secret, now + i * 30000) === input) return true;
    }
    return false;
};

/**
 * Build an otpauth:// provisioning URI for authenticator apps.
 */
const createOtpAuthUrl = (secret, account, issuer = 'Emare ELMS') => {
    const label = `${issuer}:${account}`;
    const params = new URLSearchParams({
        secret,
        issuer,
        algorithm: 'SHA1',
        digits: '6',
        period: '30',
    });
    return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
};

module.exports = {
    generateSecret,
    generateTOTP,
    verifyTOTP,
    createOtpAuthUrl,
    base32Encode,
    base32Decode,
};