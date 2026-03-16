import { apiSuccess } from "@/lib/api-helpers";
import { clearSession } from "@/lib/auth";

export async function POST() {
  await clearSession();
  return apiSuccess({ message: "Signed out" });
}
