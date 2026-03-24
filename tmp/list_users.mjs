import mongoose from 'mongoose';

async function run() {
  try {
    const MONGODB_URI = 'mongodb+srv://abdullahazmat945_db_user:dRZn88FsYwIMRlJd@cluster0.1rf35kj.mongodb.net/kashapos';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const users = await mongoose.connection.db.collection('users').find({}).limit(5).toArray();
    console.log('Sample users:', users.map(u => ({ email: u.email, name: u.name, _id: u._id })));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
