type AiTone = "professional" | "friendly" | "concise" | "brief";

type AiModelPreference =
  | "standard"
  | "advanced"
  | "balanced"
  | "fast"
  | "accurate";

type AiDataPreference = "strict" | "assisted";

type ExternalAiProviderConfig = {
  providerName: string;
  baseUrl: string;
  apiKey: string;
  model: string;
};

type ExternalAiMessage = {
  role: "system" | "user";
  content: string;
};

type ExternalAiChatResponse = {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
};

export type ExternalBusinessContext = {
  contextLabel: string;
  language: "en" | "lg" | "sw";
  tone: AiTone;
  dataPreference: AiDataPreference;
  tenant: {
    name?: string;
  };
  metrics: Record<string, number>;
  topProducts: Array<{
    name: string;
    revenue: number;
    quantity: number;
  }>;
  lowStockItems: Array<{
    name: string;
    quantity: number;
    reorderLevel: number;
  }>;
  overdueInvoices: Array<{
    balance: number;
    dueDate?: string | null;
  }>;
};

function getModelForPreference(preference: AiModelPreference) {
  const envMap: Record<AiModelPreference, string | undefined> = {
    standard: process.env.AI_PROVIDER_MODEL_STANDARD,
    advanced: process.env.AI_PROVIDER_MODEL_ADVANCED,
    balanced: process.env.AI_PROVIDER_MODEL_BALANCED,
    fast: process.env.AI_PROVIDER_MODEL_FAST,
    accurate: process.env.AI_PROVIDER_MODEL_ACCURATE,
  };

  return (
    envMap[preference] ||
    process.env.AI_PROVIDER_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4.1-mini"
  );
}

export function getExternalAiProviderConfig(
  preference: AiModelPreference,
): ExternalAiProviderConfig | null {
  const apiKey =
    process.env.AI_PROVIDER_API_KEY || process.env.OPENAI_API_KEY || "";

  if (!apiKey.trim()) {
    return null;
  }

  return {
    providerName:
      process.env.AI_PROVIDER_NAME || process.env.AI_PROVIDER || "openai",
    baseUrl: (
      process.env.AI_PROVIDER_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      "https://api.openai.com/v1"
    ).replace(/\/+$/, ""),
    apiKey,
    model: getModelForPreference(preference),
  };
}

function normalizeProviderContent(content: ExternalAiChatResponse["choices"]) {
  const raw = content?.[0]?.message?.content;
  if (typeof raw === "string") {
    return raw.trim();
  }

  if (Array.isArray(raw)) {
    return raw
      .map((item) => item.text || "")
      .join("\n")
      .trim();
  }

  return "";
}

function toProviderPromptContext(input: ExternalBusinessContext) {
  const hideNames = input.dataPreference === "strict";

  return {
    contextLabel: input.contextLabel,
    language: input.language,
    tone: input.tone,
    metrics: input.metrics,
    topProducts: input.topProducts.map((item, index) => ({
      name: hideNames ? `Product ${index + 1}` : item.name,
      revenue: item.revenue,
      quantity: item.quantity,
    })),
    lowStockItems: input.lowStockItems.map((item, index) => ({
      name: hideNames ? `Item ${index + 1}` : item.name,
      quantity: item.quantity,
      reorderLevel: item.reorderLevel,
    })),
    overdueInvoices: input.overdueInvoices.map((invoice) => ({
      balance: invoice.balance,
      dueDate: invoice.dueDate || null,
    })),
  };
}

function buildMessages(params: {
  question: string;
  businessContext: ExternalBusinessContext;
}): ExternalAiMessage[] {
  const promptContext = JSON.stringify(
    toProviderPromptContext(params.businessContext),
    null,
    2,
  );

  return [
    {
      role: "system",
      content:
        "You are Meka POS AI Assistant. Use the structured business context when it is relevant. Never invent missing metrics. Never claim access to data not present in the prompt. Never output raw customer PII, emails, phone numbers, or internal identifiers. Keep answers practical and concise. If the question is general and unrelated to business data, answer briefly without pretending to browse the web.",
    },
    {
      role: "user",
      content: `Question: ${params.question}\n\nStructured business context:\n${promptContext}`,
    },
  ];
}

export async function generateExternalAiReply(params: {
  question: string;
  language: "en" | "lg" | "sw";
  tone: AiTone;
  modelPreference: AiModelPreference;
  businessContext: ExternalBusinessContext;
}): Promise<string | null> {
  const config = getExternalAiProviderConfig(params.modelPreference);
  if (!config) {
    return null;
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: params.tone === "friendly" ? 0.5 : 0.2,
      max_tokens: 320,
      messages: buildMessages({
        question: params.question,
        businessContext: params.businessContext,
      }),
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(
      `External AI provider error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as ExternalAiChatResponse;
  const content = normalizeProviderContent(data.choices);
  return content || null;
}
