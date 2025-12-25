import { generateText } from "ai";
import { getModel } from "../ai/provider";
import { log } from "console";

export interface MergeResult {
  success: boolean;
  mergedCode?: string;
  error?: string;
}

const MERGE_MODEL = "gemini-2.5-flash-lite"; // Using Flash 2.0 for best speed/intelligence balance that is widely available

const MERGE_SYSTEM_PROMPT = `
You are an expert software engineer specializing in code merging and refactoring.
Your task is to merge a provided "update snippet" into an "original code" file based on specific "instructions".

RULES:
1. ALWAYS return the COMPLETE merged file content.
2. DO NOT include any markdown code fences, explanations, or commentary.
3. PRESERVE all existing code that is not being modified.
4. ENSURE the merged code is syntactically correct and follows the original coding style.
5. If the update snippet is a whole component, replace the old one. If it's a small change, integrate it carefully.
6. DO NOT remove imports unless they are no longer needed.
7. Be extremely careful not to lose any logic from the original file.

Return ONLY the final code.
`;

export async function mergeCodeWithGemini(params: {
  originalCode: string;
  instructions: string;
  updateSnippet: string;
  fileName: string;
}): Promise<MergeResult> {
  try {
    console.log("MERGE_MODEL", MERGE_MODEL);
    const { originalCode, instructions, updateSnippet, fileName } = params;

    const prompt = `
FILE: ${fileName}

INSTRUCTIONS:
${instructions}

UPDATE SNIPPET:
${updateSnippet}

ORIGINAL CODE:
${originalCode}

Please merge the update snippet into the original code following the instructions. 
Return the full, complete merged file content.
`;

    const result = await generateText({
      model: getModel(MERGE_MODEL),
      system: MERGE_SYSTEM_PROMPT,
      prompt: prompt,
      temperature: 0.1, // Low temperature for precision
    });

    const mergedCode = result.text.trim();

    if (!mergedCode || mergedCode.length < 10) {
      return {
        success: false,
        error: "Gemini returned empty or invalid merged code",
      };
    }

    // Basic heuristic to check if Gemini returned just an error message
    if (mergedCode.startsWith("I cannot") || mergedCode.startsWith("Sorry")) {
      return {
        success: false,
        error: `Gemini failed to merge: ${mergedCode}`,
      };
    }

    return { success: true, mergedCode };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error during merge",
    };
  }
}
