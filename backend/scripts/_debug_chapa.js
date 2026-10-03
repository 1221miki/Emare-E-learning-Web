require('dotenv').config();
const axios = require('axios');
const key = process.env.CHAPA_SECRET_KEY;
const base = process.env.CHAPA_BASE_URL || 'https://api.chapa.co/v1';

async function tryPayload(name, payload) {
    const tx_ref = 'EMARE-EVT-TEST-' + Date.now() + '-' + name.replace(/[^a-z]/gi, '');
    const full = { ...payload, tx_ref, callback_url: 'http://localhost:5173/payment/callback?tx_ref=' + tx_ref + '&type=event', return_url: 'http://localhost:5173/payment/callback?tx_ref=' + tx_ref + '&type=event' };
    try {
        const res = await axios.post(`${base}/transaction/initialize`, full, { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } });
        console.log(`[${name}] OK`);
    } catch (err) {
        console.log(`[${name}] HTTP ${err.response && err.response.status}:`, JSON.stringify((err.response && err.response.data) || err.message).slice(0, 250));
    }
}

(async () => {
    const d1 = 'Event 678'; // valid chars
    const d2 = 'Event: 678'; // colon
    await tryPayload('J-colon-desc', { amount: 678, currency: 'ETB', email: 'asawmikael@gmail.com', first_name: 'Test', last_name: 'Payment', customization: { title: 'Emare ICT Hub', description: d2 } });
    await tryPayload('K-valid-desc', { amount: 678, currency: 'ETB', email: 'asawmikael@gmail.com', first_name: 'Test', last_name: 'Payment', customization: { title: 'Emare ICT Hub', description: d1 } });
    await tryPayload('L-emareicthub-email', { amount: 678, currency: 'ETB', email: 'payments@emareicthub.com', first_name: 'Test', last_name: 'Payment', customization: { title: 'Emare ICT Hub', description: d1 } });
    await tryPayload('M-no-email-guest', { amount: 678, currency: 'ETB', first_name: 'Test', last_name: 'Payment', customization: { title: 'Emare ICT Hub', description: d1 } });
})();