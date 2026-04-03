import dbConnect from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-helpers";
import Plan from "@/models/Plan";
import { resolveSubscriptionWorkflow } from "@/lib/subscription-policy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const plans = await Plan.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const mappedPlans = plans.map((plan) => {
      const workflow = resolveSubscriptionWorkflow({
        name: plan.name,
        price: plan.price,
        isActive: plan.isActive,
      });

      return {
        ...plan,
        checkoutWorkflow: workflow.workflow,
        workflowReason: workflow.reason,
        workflowMessage: workflow.message,
        gatewayLimit: workflow.gatewayLimit,
      };
    });

    return apiSuccess(mappedPlans);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return apiError(message, 500);
  }
}
