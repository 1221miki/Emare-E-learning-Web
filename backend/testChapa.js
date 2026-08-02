require('dotenv').config({ path: '../.env' });
const axios = require('axios');

async function testChapa() {
    const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
    console.log("Using Secret Key:", CHAPA_SECRET_KEY);
    
    const payload = {
        amount: "100",
        currency: "ETB",
        email: "student@emare.com",
        first_name: "",
        last_name: "",
        tx_ref: "test-tx-" + Date.now(),
        callback_url: "http://localhost:5000/webhook",
        return_url: "http://localhost:3000/return",
        customization: {
            title: "Test Payment",
            description: "Testing Chapa API"
        }
    };

    try {
        const res = await axios.post('https://api.chapa.co/v1/transaction/initialize', payload, {
            headers: {
                Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log("Success:", JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error("Error Response:", err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
    }
}

testChapa();
