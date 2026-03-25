import dbConnect from "./src/lib/db";
import StockAdjustment from "./src/models/StockAdjustment";
import ActivityLog from "./src/models/ActivityLog";
import Product from "./src/models/Product";
import User from "./src/models/User";

async function backfillActivityLogs() {
  await dbConnect();
  
  const adjustments = await StockAdjustment.find({}).sort({ createdAt: -1 }).limit(10);
  console.log(`Found ${adjustments.length} recent adjustments.`);
  
  for (const adj of adjustments) {
    const product = await Product.findById(adj.productId);
    const user = await User.findById(adj.performedBy);
    
    // Check if activity log already exists
    const exists = await ActivityLog.findOne({
      tenantId: adj.tenantId,
      module: "stock",
      "metadata.adjustmentId": adj._id
    });
    
    if (!exists) {
      await ActivityLog.create({
        tenantId: adj.tenantId,
        userId: adj.performedBy,
        userName: user?.name || "System",
        action: "update",
        module: "stock",
        description: `Adjusted stock for ${product?.name || "item"}: ${adj.type === "addition" ? "+" : "-"}${adj.quantity} units (${adj.type})`,
        metadata: { productId: adj.productId, adjustmentId: adj._id, type: adj.type, delta: adj.quantity },
        createdAt: adj.createdAt // Preserve exact time
      });
      console.log(`Backfilled log for: ${product?.name}`);
    } else {
      console.log(`Log already exists for: ${product?.name}`);
    }
  }
}

backfillActivityLogs().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
