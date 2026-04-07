
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function runAudit() {
  const { africasTalkingService } = await import("../src/lib/africastalking");
  const testPhone = "0788037551"; // NO PLUS, STARTING WITH 0
  const res = await africasTalkingService.sendSMS(testPhone, "KashaPOS Normalization Audit Test");
  console.log("AT Result with raw input '0788...':", res.success ? "✅ OK" : `❌ FAIL (${res.message})`);
}

runAudit().catch(console.error);
