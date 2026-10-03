let chapaAdapter = null;
try {
  chapaAdapter = require('./chapaAdapter');
} catch (err) {
  // adapter not found; chapaAdapter remains null
}

if (chapaAdapter && typeof chapaAdapter === 'object') {
  module.exports = chapaAdapter;
} else {
  module.exports = {
    initialize: async () => {
      throw new Error('chapaService: chapaAdapter not found');
    },
    verify: async () => {
      throw new Error('chapaService: chapaAdapter not found');
    }
  };
}
