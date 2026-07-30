const axios = require('axios');

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || '';
const INIT_URL = 'https://api.chapa.co/v1/transaction/initialize';
const VERIFY_URL = 'https://api.chapa.co/v1/transaction/verify';

async function initialize(payload) {
    if (!CHAPA_SECRET_KEY) {
        // In development, return a mock response
        return { data: { checkout_url: `/mock-checkout/${payload.tx_ref}`, data: { tx_ref: payload.tx_ref } } };
    }
    const res = await axios.post(INIT_URL, payload, { headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` } });
    return res;
}

async function verify(tx_ref) {
    if (!CHAPA_SECRET_KEY) {
        return { data: { status: 'success', data: { tx_ref } } };
    }
    const res = await axios.get(`${VERIFY_URL}/${tx_ref}`, { headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` } });
    return res;
}

module.exports = { initialize, verify };
