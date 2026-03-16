import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import { apiError, apiSuccess, getAuthContext } from "@/lib/api-helpers";
import { getExternalAiProviderConfig } from "@/lib/ai-provider";

type ModelPreference =
  | "standard"
  | "advanced"
  | "balanced"
  | "fast"
  | "accurate";

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthContext(request);

    if (auth.role !== "admin") {
      return apiError("Insufficient permissions", 403);
    }

    await dbConnect();

    const tenant = await Tenant.findById(auth.tenantId)
      .select("settings.aiModelPreference")
      .lean();

    const modelPreference = ((tenant?.settings
      ?.aiModelPreference as ModelPreference) || "standard") as ModelPreference;

    const config = getExternalAiProviderConfig(modelPreference);
    const checkedAt = new Date().toISOString();

    if (!config) {
      return apiSuccess({
        configured: false,
        reachable: false,
        checkedAt,
        providerName: null,
        model: null,
        message:
          "No external AI provider credentials found. Configure AI_PROVIDER_API_KEY or OPENAI_API_KEY.",
      });
    }

    try {
      const response = await fetch(`${config.baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        return apiSuccess({
          configured: true,
          reachable: false,
          checkedAt,
          providerName: config.providerName,
          model: config.model,
          baseUrl: config.baseUrl,
          message: `Provider responded with ${response.status} ${response.statusText}`,
        });
      }

      return apiSuccess({
        configured: true,
        reachable: true,
        checkedAt,
        providerName: config.providerName,
        model: config.model,
        baseUrl: config.baseUrl,
        message: "External provider is reachable.",
      });
    } catch (error) {
      return apiSuccess({
        configured: true,
        reachable: false,
        checkedAt,
        providerName: config.providerName,
        model: config.model,
        baseUrl: config.baseUrl,
        message:
          error instanceof Error
            ? error.message
            : "Provider reachability check failed.",
      });
    }
  } catch (error) {
    console.error("AI provider status check error:", error);
    return apiError("Failed to check AI provider status", 500);
  }
}
