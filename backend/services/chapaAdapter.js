const axios = require('axios');

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || '';
const CHAPA_BASE_URL = process.env.CHAPA_BASE_URL || 'https://api.chapa.co/v1';
const INIT_URL = `${CHAPA_BASE_URL}/transaction/initialize`;
const VERIFY_URL = `${CHAPA_BASE_URL}/transaction/verify`;

/**
 * Mock mode is a DEVELOPMENT convenience only. Without this guard a missing
 * secret key would make `verify()` answer "success", which would grant paid
 * event access in production. In production we refuse instead of faking it.
 */
const isProduction = () => String(process.env.NODE_ENV || '').toLowerCase() === 'production';

const mockAllowed = () => !CHAPA_SECRET_KEY && !isProduction();

/** The callback URL already carries the event slug, so mock checkout can reuse it. */
const eventSlugFromCallback = (callbackUrl) => {
    try {
        const url = new URL(String(callbackUrl || ''), 'http://localhost');
        return url.searchParams.get('event') || '';
    } catch {
        return '';
    }
};

const missingKeyError = () => {
    const err = new Error('Payment gateway is not configured (CHAPA_SECRET_KEY is missing).');
    err.status = 503;
    err.code = 'PAYMENT_NOT_CONFIGURED';
    return err;
};

async function initialize(payload) {
    if (!CHAPA_SECRET_KEY) {
        if (!mockAllowed()) throw missingKeyError();
        // Local development without keys: hand back the in-app mock checkout.
        console.warn('[Chapa] No CHAPA_SECRET_KEY set — using mock checkout (development only)');
        const slug = eventSlugFromCallback(payload.callback_url);
        const query = slug ? `?event=${encodeURIComponent(slug)}` : '';
        return { data: { checkout_url: `/mock-checkout/${payload.tx_ref}${query}`, data: { tx_ref: payload.tx_ref } } };
    }

    try {
        console.log('[Chapa] Initializing transaction:', payload.tx_ref, 'Amount:', payload.amount, payload.currency);
        const res = await axios.post(INIT_URL, payload, {
            headers: {
                Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('[Chapa] Init success — checkout_url:', res.data?.data?.checkout_url);
        return res;
    } catch (err) {
        console.error('[Chapa] Init failed:', err.response?.data || err.message);
        throw err;
    }
}

async function verify(tx_ref) {
    if (!CHAPA_SECRET_KEY) {
        if (!mockAllowed()) throw missingKeyError();
        console.warn('[Chapa] No CHAPA_SECRET_KEY set — returning mock success (development only)');
        return { data: { status: 'success', data: { tx_ref } } };
    }

    try {
        console.log('[Chapa] Verifying transaction:', tx_ref);
        const res = await axios.get(`${VERIFY_URL}/${tx_ref}`, {
            headers: {
                Authorization: `Bearer ${CHAPA_SECRET_KEY}`
            }
        });
        console.log('[Chapa] Verify result:', res.data?.status, res.data?.data?.status);
        return res;
    } catch (err) {
        console.error('[Chapa] Verify failed:', err.response?.data || err.message);
        throw err;
    }
}

module.exports = { initialize, verify, isProduction };