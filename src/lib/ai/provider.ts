import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { appEnv } from "../env/env.server";
import { appConfig } from "../config";

const googleClient = createGoogleGenerativeAI({
  apiKey: appEnv.GEMINI_API_KEY,
});

export function getModel(modelId?: string) {
  const model = modelId ?? appEnv.DEFAULT_MODEL ?? appConfig.ai.defaultModel;
  return googleClient(model);
}

export function getAvailableModels() {
  return appConfig.ai.availableModels;
}

export function getModelDisplayName(modelId: string): string {
  return appConfig.ai.modelDisplayNames[modelId] || modelId;
}
