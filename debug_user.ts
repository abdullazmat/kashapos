import dbConnect from "./src/lib/db";
import StockAdjustment from "./src/models/StockAdjustment";
import Product from "./src/models/Product";

async function checkRecent() {
  await dbConnect();
  
  const adjustments = await StockAdjustment.find({}).sort({ createdAt: -1 }).limit(20);
  console.log(`Analyzing ${adjustments.length} most recent adjustments:`);
  
  for (const adj of adjustments) {
    const product = await Product.findById(adj.productId);
    console.log(`- ${product?.name} | Qty: ${adj.quantity} | Date: ${adj.createdAt}`);
  }
}

checkRecent().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
