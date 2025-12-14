import { generateText } from "ai";
import { getModel } from "../ai/provider";
import type { FileManifest, EditIntent, EditType } from "../types/files";
import { analyzeEditIntent } from "./intent-analyzer";

const INTENT_MODEL = "gemini-2.5-flash";

interface IntentAnalysisResult {
  type: EditType;
  isCreatingNew: boolean;
  isEditingExisting: boolean;
  targetComponentNames: string[];
  targetFilePaths: string[];
  description: string;
  confidence: number;
}

export async function analyzeIntentWithLLM(
  prompt: string,
  manifest: FileManifest
): Promise<EditIntent> {
  console.log("[LLM Intent Analyzer] Starting intent analysis", {
    prompt: prompt.substring(0, 100),
    filesCount: Object.keys(manifest.files).length,
    entryPoint: manifest.entryPoint,
  });

  try {
    const fileList = Object.keys(manifest.files)
      .slice(0, 20)
      .map((path) => {
        const file = manifest.files[path];
        const componentName =
          file.componentInfo?.name || path.split("/").pop() || "";
        return { path, componentName, type: file.type };
      });

    console.log("[LLM Intent Analyzer] File list prepared", {
      fileCount: fileList.length,
      files: fileList.map((f) => f.path),
    });

    const systemPrompt = `You are an expert at analyzing user intent for code generation tasks. Analyze the user's prompt and determine their intent.

Available Edit Types:
- UPDATE_COMPONENT: User wants to modify an existing component/page
- ADD_FEATURE: User wants to create a new feature/component/page
- FIX_ISSUE: User wants to fix a bug or error
- UPDATE_STYLE: User wants to change styling/colors/theming
- REFACTOR: User wants to refactor/clean up code
- FULL_REBUILD: User wants to rebuild everything from scratch
- ADD_DEPENDENCY: User wants to install/add a package

Available files in project:
${fileList.map((f) => `- ${f.path} (${f.componentName})`).join("\n")}

Analyze the user's intent and return:
1. The most appropriate EditType
2. Whether they're creating something new or editing existing
3. Target component/file names mentioned
4. Target file paths (match from available files if editing, or suggest new paths if creating)
5. A clear description
6. Confidence level (0-1)

If creating new features, suggest appropriate file paths like "src/components/FeatureName.jsx".
If editing existing, match to actual file paths from the available files.`;

    console.log("[LLM Intent Analyzer] Calling LLM for intent analysis", {
      model: INTENT_MODEL,
      promptLength: prompt.length,
    });

    const result = await generateText({
      model: getModel(INTENT_MODEL),
      system: systemPrompt,
      prompt: `User prompt: "${prompt}"

Analyze this prompt and determine the user's intent. Return ONLY valid JSON in this exact format:
{
  "type": "UPDATE_COMPONENT" | "ADD_FEATURE" | "FIX_ISSUE" | "UPDATE_STYLE" | "REFACTOR" | "FULL_REBUILD" | "ADD_DEPENDENCY",
  "isCreatingNew": boolean,
  "isEditingExisting": boolean,
  "targetComponentNames": string[],
  "targetFilePaths": string[],
  "description": string,
  "confidence": number (0-1)
}`,
      temperature: 0.3,
    });

    console.log("[LLM Intent Analyzer] LLM response received", {
      responseLength: result.text.length,
      responsePreview: result.text.substring(0, 200),
    });

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[LLM Intent Analyzer] No JSON found in response", {
        fullResponse: result.text,
      });
      throw new Error("No JSON found in response");
    }

    const analysis = JSON.parse(jsonMatch[0]) as IntentAnalysisResult;
    console.log("[LLM Intent Analyzer] Parsed analysis result", {
      type: analysis.type,
      isCreatingNew: analysis.isCreatingNew,
      isEditingExisting: analysis.isEditingExisting,
      targetComponentNames: analysis.targetComponentNames,
      targetFilePaths: analysis.targetFilePaths,
      description: analysis.description,
      confidence: analysis.confidence,
    });

    const targetFiles =
      analysis.targetFilePaths.length > 0
        ? analysis.targetFilePaths
        : analysis.isCreatingNew
          ? []
          : [manifest.entryPoint];

    const suggestedContext = Object.keys(manifest.files)
      .filter((file) => !targetFiles.includes(file))
      .slice(0, 10);

    const finalIntent: EditIntent = {
      type: analysis.type as EditType,
      targetFiles,
      confidence: analysis.confidence,
      description: analysis.description,
      suggestedContext,
    };

    console.log("[LLM Intent Analyzer] Intent analysis complete", {
      finalIntent,
      targetFilesCount: targetFiles.length,
      contextFilesCount: suggestedContext.length,
    });

    return finalIntent;
  } catch (error) {
    console.error("[LLM Intent Analyzer] Failed, falling back to regex", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const fallbackIntent = analyzeEditIntent(prompt, manifest);
    console.log("[LLM Intent Analyzer] Fallback regex intent", {
      fallbackIntent,
    });
    return fallbackIntent;
  }
}
