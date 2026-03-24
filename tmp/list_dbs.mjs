import mongoose from 'mongoose';

async function run() {
  try {
    const MONGODB_URI = 'mongodb+srv://abdullahazmat945_db_user:dRZn88FsYwIMRlJd@cluster0.1rf35kj.mongodb.net';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to cluster');

    const adminDb = mongoose.connection.db.admin();
    const dbs = await adminDb.listDatabases();
    console.log('DBs:', dbs.databases.map(d => d.name));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
