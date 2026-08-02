const mongoose = require('mongoose');

(async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/emare-elms';
    await mongoose.connect(uri);
    const User = require('./models/User');
    const users = await User.find({ accountEmail: { $in: ['admin@emare.com', 'student@emare.com', 'instructor@emare.com'] } })
      .select('accountEmail assignedRole isActive isSuspended securedPassword');
    console.log('FOUND', users.length);
    users.forEach(u => {
      console.log(JSON.stringify({
        email: u.accountEmail,
        role: u.assignedRole,
        active: u.isActive,
        suspended: u.isSuspended,
        pwd: u.securedPassword ? 'HASHED' : 'NOT_SELECTED'
      }));
    });
    await mongoose.disconnect();
  } catch (e) {
    console.error('ERROR', e.message);
    process.exit(1);
  }
})();
