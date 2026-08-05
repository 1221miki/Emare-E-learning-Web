const axios = require('axios');

(async () => {
  const cases = [
    { email: 'admin@emare.com', password: 'admin12345' },
    { email: 'student@emare.com', password: 'student12345' },
    { email: 'instructor@emare.com', password: 'instructor12345' }
  ];

  for (const test of cases) {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        accountEmail: test.email,
        securedPassword: test.password
      }, {
        validateStatus: () => true,
        withCredentials: true
      });
      console.log(test.email, res.status, res.data);
    } catch (err) {
      if (err.response) {
        console.error(test.email, err.response.status, err.response.data);
      } else {
        console.error(test.email, err.message);
      }
    }
  }
})();
