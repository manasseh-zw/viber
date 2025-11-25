import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { appEnv } from "../env";

const googleClient = createGoogleGenerativeAI({
  apiKey: appEnv.GEMINI_API_KEY,
});

export function getModel(modelId?: string) {
  const model = modelId ?? appEnv.DEFAULT_MODEL;
  return googleClient(model);
}
