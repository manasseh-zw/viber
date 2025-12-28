import { generateText } from "ai";
import { getModel } from "../ai/provider";

const INTENT_MODEL = "gemini-2.5-flash";

export interface FileSelectionResult {
  targetFiles: string[];
  editType: string;
  description: string;
  confidence: number;
}

export async function selectFilesForEdit(
  prompt: string,
  fileList: string[]
): Promise<FileSelectionResult> {
  console.log("[LLM Intent Analyzer] Starting file selection", {
    prompt: prompt.substring(0, 100),
    filesCount: fileList.length,
  });

  const startTime = Date.now();

  try {
    const formattedFileList = fileList
      .filter((f) => !f.includes("node_modules") && !f.includes(".git"))
      .slice(0, 30)
      .map((path) => {
        const fileName = path.split("/").pop() || path;
        const isComponent = /^[A-Z]/.test(
          fileName.replace(/\.(jsx?|tsx?)$/, "")
        );
        return `- ${path}${isComponent ? " (component)" : ""}`;
      })
      .join("\n");

    const systemPrompt = `You are an expert at analyzing code edit requests. Given a user's edit prompt and a list of project files, determine which files need to be modified.

RULES:
1. Select ONLY the files that need to be edited - usually 1-3 files max
2. For style changes (colors, fonts, spacing), select the specific component file
3. For "header" edits, look for Header.tsx/jsx, not App.tsx
4. For "footer" edits, look for Footer.tsx/jsx
5. For adding new features, you may need App.tsx to import the new component
6. Be surgical - don't select files that don't need changes

Edit Types:
- UPDATE_COMPONENT: Modifying existing component
- UPDATE_STYLE: Changing colors, fonts, spacing
- ADD_FEATURE: Creating new component/feature
- FIX_ISSUE: Fixing a bug
- FULL_REBUILD: Complete rebuild (rare)

Return ONLY valid JSON.`;

    const result = await generateText({
      model: getModel(INTENT_MODEL),
      system: systemPrompt,
      prompt: `User wants to: "${prompt}"

Available files:
${formattedFileList}

Which files need to be edited? Return JSON:
{
  "targetFiles": ["path/to/file1.tsx", "path/to/file2.tsx"],
  "editType": "UPDATE_COMPONENT",
  "description": "Brief description of what will be changed",
  "confidence": 0.9
}`,
      temperature: 0.2,
    });

    const elapsed = Date.now() - startTime;
    console.log("[LLM Intent Analyzer] LLM response received", {
      elapsed: `${elapsed}ms`,
      responseLength: result.text.length,
    });

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[LLM Intent Analyzer] No JSON found, using fallback");
      return fallbackFileSelection(prompt, fileList);
    }

    const analysis = JSON.parse(jsonMatch[0]) as FileSelectionResult;

    // Normalize paths for comparison (remove leading/trailing slashes, handle relative paths)
    const normalizePath = (path: string): string => {
      return path.trim().replace(/^\/+|\/+$/g, "");
    };

    // Use exact path matching to avoid false positives from substring matches
    // Try multiple matching strategies in order of specificity
    const validatedFiles = analysis.targetFiles
      .map((targetPath) => {
        const normalizedTarget = normalizePath(targetPath);

        // Strategy 1: Exact match
        let match = fileList.find((existing) => existing === targetPath);
        if (match) return match;

        // Strategy 2: Normalized exact match (handles leading/trailing slash differences)
        match = fileList.find(
          (existing) => normalizePath(existing) === normalizedTarget
        );
        if (match) return match;

        // Strategy 3: Ends-with match for full paths (LLM might return "src/App.tsx" when actual is "/home/user/app/src/App.tsx")
        // Only use this if target contains path separators to avoid false positives
        if (normalizedTarget.includes("/")) {
          match = fileList.find((existing) =>
            existing.endsWith(normalizedTarget)
          );
          if (match) return match;
        }

        // Strategy 4: Filename-only match (only if target is just a filename without path)
        // This is risky, so we only use it if there's exactly one match to avoid false positives
        if (!normalizedTarget.includes("/")) {
          const filenameMatches = fileList.filter((existing) => {
            const existingFileName = existing.split("/").pop();
            return existingFileName === normalizedTarget;
          });
          // Only use filename match if there's exactly one file with that name
          // Prefer files in common locations (src/, src/components/) over nested paths
          if (filenameMatches.length === 1) {
            return filenameMatches[0];
          } else if (filenameMatches.length > 1) {
            // If multiple matches, prefer the most common location
            const preferredMatch = filenameMatches.find(
              (f) => f.includes("src/components/") || f.includes("src/")
            );
            if (preferredMatch) return preferredMatch;
            // Otherwise return first match (but log warning)
            console.warn(
              `[LLM Intent Analyzer] Multiple files found for "${normalizedTarget}", using first match: ${filenameMatches[0]}`
            );
            return filenameMatches[0];
          }
        }

        return null;
      })
      .filter((f): f is string => f !== null)
      // Remove duplicates (in case multiple strategies matched the same file)
      .filter((value, index, self) => self.indexOf(value) === index);

    if (validatedFiles.length === 0) {
      console.warn(
        "[LLM Intent Analyzer] No valid files matched, using fallback"
      );
      return fallbackFileSelection(prompt, fileList);
    }

    const finalResult: FileSelectionResult = {
      targetFiles: validatedFiles,
      editType: analysis.editType || "UPDATE_COMPONENT",
      description: analysis.description || "Edit files",
      confidence: analysis.confidence || 0.8,
    };

    console.log("[LLM Intent Analyzer] File selection complete", {
      elapsed: `${elapsed}ms`,
      targetFiles: finalResult.targetFiles,
      editType: finalResult.editType,
    });

    return finalResult;
  } catch (error) {
    console.error("[LLM Intent Analyzer] Error, using fallback", {
      error: error instanceof Error ? error.message : String(error),
    });
    return fallbackFileSelection(prompt, fileList);
  }
}

function fallbackFileSelection(
  prompt: string,
  fileList: string[]
): FileSelectionResult {
  const lowerPrompt = prompt.toLowerCase();
  const targetFiles: string[] = [];

  const componentKeywords = [
    "header",
    "footer",
    "hero",
    "nav",
    "sidebar",
    "menu",
    "card",
    "button",
    "modal",
    "form",
    "about",
    "contact",
    "features",
    "pricing",
    "testimonials",
    "services",
    "team",
    "gallery",
  ];

  for (const keyword of componentKeywords) {
    if (lowerPrompt.includes(keyword)) {
      const matchingFile = fileList.find((f) => {
        const fileName = f.split("/").pop()?.toLowerCase() || "";
        return fileName.includes(keyword);
      });
      if (matchingFile) {
        targetFiles.push(matchingFile);
        break;
      }
    }
  }

  if (targetFiles.length === 0) {
    const appFile = fileList.find(
      (f) => f.endsWith("App.tsx") || f.endsWith("App.jsx")
    );
    if (appFile) {
      targetFiles.push(appFile);
    }
  }

  const cssFile = fileList.find(
    (f) => f.endsWith("index.css") || f.endsWith("globals.css")
  );
  if (cssFile && lowerPrompt.match(/style|color|theme|css|font|background/)) {
    targetFiles.push(cssFile);
  }

  return {
    targetFiles,
    editType: "UPDATE_COMPONENT",
    description: "Fallback file selection",
    confidence: 0.5,
  };
}
