const axios = require('axios');

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || '';
const CHAPA_BASE_URL = process.env.CHAPA_BASE_URL || 'https://api.chapa.co/v1';
const INIT_URL = `${CHAPA_BASE_URL}/transaction/initialize`;
const VERIFY_URL = `${CHAPA_BASE_URL}/transaction/verify`;

async function initialize(payload) {
    if (!CHAPA_SECRET_KEY) {
        // In development without keys, return a mock response
        console.warn('[Chapa] No CHAPA_SECRET_KEY set — using mock checkout');
        return { data: { checkout_url: `/mock-checkout/${payload.tx_ref}`, data: { tx_ref: payload.tx_ref } } };
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
        console.warn('[Chapa] No CHAPA_SECRET_KEY set — returning mock success');
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

module.exports = { initialize, verify };
