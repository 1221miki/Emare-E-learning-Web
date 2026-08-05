const axios = require('axios');
const key = 'CHASECK_TEST-gh8pkhf3mMKMOC69FcFLB17Xd5qAdCql';
const payload = {
  amount: 2800,
  currency: 'ETB',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  tx_ref: 'EMARE-TX-TEST-1234',
  callback_url: 'http://localhost:3000/payment/callback?tx_ref=EMARE-TX-TEST-1234',
  return_url: 'http://localhost:3000/payment/callback?tx_ref=EMARE-TX-TEST-1234'
};
axios.post('https://api.chapa.co/v1/transaction/initialize', payload, {
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  }
}).then(res => {
  console.log(JSON.stringify(res.data, null, 2));
}).catch(err => {
  console.error('ERROR status:', err.response?.status);
  console.error('ERROR data:', JSON.stringify(err.response?.data || err.message, null, 2));
});
