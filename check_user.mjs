import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

async function check() {
  if (!uri) {
    console.error("MONGODB_URI not found");
    return;
  }
  try {
    await mongoose.connect(uri);
    const collection = mongoose.connection.db.collection("users");
    
    console.log("Checking for phone: +923175184327 or 923175184327");
    const phones = await collection.find({ $or: [{ phone: "+923175184327" }, { phone: "923175184327" }, { phone: "256923175184327" }, { phone: "+256923175184327" }] }).toArray();
    console.log(`Found ${phones.length} accounts with this phone.`);
    console.log(phones.map(p => ({ id: p._id, name: p.name, email: p.email, phone: p.phone, method: p.signupMethod })));

    console.log("\nChecking for name: 'alex hales'");
    const names = await collection.find({ name: { $regex: /alex hales/i } }).toArray();
    console.log(`Found ${names.length} accounts with this name.`);
    console.log(names.map(p => ({ id: p._id, name: p.name, email: p.email, phone: p.phone, method: p.signupMethod })));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
