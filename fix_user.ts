import dbConnect from "./src/lib/db";
import User from "./src/models/User";

async function fixUser() {
  await dbConnect();
  
  const phone = "+256 705604645".replace(/\s+/g, "");
  const user = await User.findOneAndUpdate(
    { email: "basic@poscloud.me" },
    { $set: { phone } },
    { new: true }
  );
  
  console.log(`Updated Sarah (${user?.name}) with phone: ${user?.phone}`);
}

fixUser().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
