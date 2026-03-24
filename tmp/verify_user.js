const mongoose = require('mongoose');

async function run() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kashapos';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    // Simple raw check without models to ensure it works even if models are slightly different
    const user = await mongoose.connection.db.collection('users').findOneAndUpdate(
      { email: 'abdullahazmat945@gmail.com' },
      { $set: { emailVerified: true, emailVerificationToken: null } },
      { returnDocument: 'after' }
    );

    if (user) {
      console.log('User verified successfully:', user.email);
    } else {
      console.log('User not found: abdullahazmat945@gmail.com');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
