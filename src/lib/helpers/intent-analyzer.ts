import type {
  FileManifest,
  EditType,
  EditIntent,
  IntentPattern,
} from "../types/files";
import { EditType as ET } from "../types/files";

export function analyzeEditIntent(
  prompt: string,
  manifest: FileManifest
): EditIntent {
  const lowerPrompt = prompt.toLowerCase();

  const patterns: IntentPattern[] = [
    {
      patterns: [
        /update\s+(the\s+)?(\w+)\s+(component|section|page)/i,
        /change\s+(the\s+)?(\w+)/i,
        /modify\s+(the\s+)?(\w+)/i,
        /edit\s+(the\s+)?(\w+)/i,
        /fix\s+(the\s+)?(\w+)\s+(styling|style|css|layout)/i,
        /remove\s+.*\s+(button|link|text|element|section)/i,
        /delete\s+.*\s+(button|link|text|element|section)/i,
        /hide\s+.*\s+(button|link|text|element|section)/i,
      ],
      type: ET.UPDATE_COMPONENT,
      fileResolver: (p, m) => findComponentByContent(p, m),
    },
    {
      patterns: [
        /add\s+(a\s+)?new\s+(\w+)\s+(page|section|feature|component)/i,
        /create\s+(a\s+)?(\w+)\s+(page|section|feature|component)/i,
        /implement\s+(a\s+)?(\w+)\s+(page|section|feature)/i,
        /build\s+(a\s+)?(\w+)\s+(page|section|feature)/i,
        /add\s+(\w+)\s+to\s+(?:the\s+)?(\w+)/i,
        /add\s+(?:a\s+)?(\w+)\s+(?:component|section)/i,
        /include\s+(?:a\s+)?(\w+)/i,
      ],
      type: ET.ADD_FEATURE,
      fileResolver: (p, m) => findFeatureInsertionPoints(p, m),
    },
    {
      patterns: [
        /fix\s+(the\s+)?(\w+|\w+\s+\w+)(?!\s+styling|\s+style)/i,
        /resolve\s+(the\s+)?error/i,
        /debug\s+(the\s+)?(\w+)/i,
        /repair\s+(the\s+)?(\w+)/i,
      ],
      type: ET.FIX_ISSUE,
      fileResolver: (p, m) => findProblemFiles(p, m),
    },
    {
      patterns: [
        /change\s+(the\s+)?(color|theme|style|styling|css)/i,
        /update\s+(the\s+)?(color|theme|style|styling|css)/i,
        /make\s+it\s+(dark|light|blue|red|green)/i,
        /style\s+(the\s+)?(\w+)/i,
      ],
      type: ET.UPDATE_STYLE,
      fileResolver: (p, m) => findStyleFiles(p, m),
    },
    {
      patterns: [
        /refactor\s+(the\s+)?(\w+)/i,
        /clean\s+up\s+(the\s+)?code/i,
        /reorganize\s+(the\s+)?(\w+)/i,
        /optimize\s+(the\s+)?(\w+)/i,
      ],
      type: ET.REFACTOR,
      fileResolver: (p, m) => findRefactorTargets(p, m),
    },
    {
      patterns: [
        /start\s+over/i,
        /recreate\s+everything/i,
        /rebuild\s+(the\s+)?app/i,
        /new\s+app/i,
        /from\s+scratch/i,
      ],
      type: ET.FULL_REBUILD,
      fileResolver: (_p, m) => [m.entryPoint],
    },
    {
      patterns: [
        /install\s+(\w+)/i,
        /add\s+(\w+)\s+(package|library|dependency)/i,
        /use\s+(\w+)\s+(library|framework)/i,
      ],
      type: ET.ADD_DEPENDENCY,
      fileResolver: (_p, m) => findPackageFiles(m),
    },
  ];

  for (const pattern of patterns) {
    for (const regex of pattern.patterns) {
      if (regex.test(lowerPrompt)) {
        const targetFiles = pattern.fileResolver(prompt, manifest);
        const suggestedContext = getSuggestedContext(targetFiles, manifest);

        return {
          type: pattern.type,
          targetFiles,
          confidence: calculateConfidence(prompt, pattern, targetFiles),
          description: generateDescription(pattern.type, prompt, targetFiles),
          suggestedContext,
        };
      }
    }
  }

  return {
    type: ET.UPDATE_COMPONENT,
    targetFiles: [manifest.entryPoint],
    confidence: 0.3,
    description: "General update to application",
    suggestedContext: [],
  };
}

function findComponentFiles(prompt: string, manifest: FileManifest): string[] {
  const files: string[] = [];
  const lowerPrompt = prompt.toLowerCase();
  const componentWords = extractComponentNames(prompt);

  for (const [path, fileInfo] of Object.entries(manifest.files)) {
    const fileName = path.split("/").pop()?.toLowerCase() || "";
    const componentName = fileInfo.componentInfo?.name.toLowerCase();

    for (const word of componentWords) {
      if (fileName.includes(word) || componentName?.includes(word)) {
        files.push(path);
        break;
      }
    }
  }

  if (files.length === 0) {
    const uiElements = [
      "header",
      "footer",
      "nav",
      "sidebar",
      "button",
      "card",
      "modal",
      "hero",
      "banner",
      "about",
      "services",
      "features",
      "testimonials",
      "gallery",
      "contact",
      "team",
      "pricing",
    ];
    for (const element of uiElements) {
      if (lowerPrompt.includes(element)) {
        for (const [path] of Object.entries(manifest.files)) {
          const fileName = path.split("/").pop()?.toLowerCase() || "";
          if (fileName.includes(element + ".") || fileName === element) {
            files.push(path);
            return files;
          }
        }

        for (const [path] of Object.entries(manifest.files)) {
          const fileName = path.split("/").pop()?.toLowerCase() || "";
          if (fileName.includes(element)) {
            files.push(path);
            return files;
          }
        }
      }
    }
  }

  if (files.length > 1) {
    return [files[0]];
  }

  return files.length > 0 ? files : [manifest.entryPoint];
}

function findFeatureInsertionPoints(
  prompt: string,
  manifest: FileManifest
): string[] {
  const files: string[] = [];
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("page")) {
    for (const [path, fileInfo] of Object.entries(manifest.files)) {
      if (
        fileInfo.content.includes("Route") ||
        fileInfo.content.includes("createBrowserRouter") ||
        path.includes("router") ||
        path.includes("routes")
      ) {
        files.push(path);
      }
    }

    if (manifest.entryPoint) {
      files.push(manifest.entryPoint);
    }
  }

  if (
    lowerPrompt.includes("component") ||
    lowerPrompt.includes("section") ||
    lowerPrompt.includes("add") ||
    lowerPrompt.includes("create")
  ) {
    const locationMatch = prompt.match(
      /(?:in|to|on|inside)\s+(?:the\s+)?(\w+)/i
    );
    if (locationMatch) {
      const location = locationMatch[1];
      const parentFiles = findComponentFiles(location, manifest);
      files.push(...parentFiles);
    } else {
      const componentWords = extractComponentNames(prompt);
      for (const word of componentWords) {
        const relatedFiles = findComponentFiles(word, manifest);
        if (
          relatedFiles.length > 0 &&
          relatedFiles[0] !== manifest.entryPoint
        ) {
          files.push(...relatedFiles);
        }
      }

      if (files.length === 0) {
        files.push(manifest.entryPoint);
      }
    }
  }

  return [...new Set(files)];
}

function findProblemFiles(prompt: string, manifest: FileManifest): string[] {
  const files: string[] = [];

  if (prompt.match(/error|bug|issue|problem|broken|not working/i)) {
    const sortedFiles = Object.entries(manifest.files)
      .sort(([, a], [, b]) => b.lastModified - a.lastModified)
      .slice(0, 5);

    files.push(...sortedFiles.map(([path]) => path));
  }

  const componentFiles = findComponentFiles(prompt, manifest);
  files.push(...componentFiles);

  return [...new Set(files)];
}

function findStyleFiles(prompt: string, manifest: FileManifest): string[] {
  const files: string[] = [];

  files.push(...manifest.styleFiles);

  const tailwindConfig = Object.keys(manifest.files).find((path) =>
    path.includes("tailwind.config")
  );
  if (tailwindConfig) files.push(tailwindConfig);

  const componentFiles = findComponentFiles(prompt, manifest);
  files.push(...componentFiles);

  return files;
}

function findRefactorTargets(prompt: string, manifest: FileManifest): string[] {
  return findComponentFiles(prompt, manifest);
}

function findPackageFiles(manifest: FileManifest): string[] {
  const files: string[] = [];

  for (const path of Object.keys(manifest.files)) {
    if (
      path.endsWith("package.json") ||
      path.endsWith("vite.config.js") ||
      path.endsWith("tsconfig.json")
    ) {
      files.push(path);
    }
  }

  return files;
}

function findComponentByContent(
  prompt: string,
  manifest: FileManifest
): string[] {
  const files: string[] = [];

  const quotedStrings = prompt.match(/["']([^"']+)["']/g) || [];
  const searchTerms: string[] = quotedStrings.map((s) => s.replace(/["']/g, ""));

  const actionMatch = prompt.match(
    /(?:remove|delete|hide)\s+(?:the\s+)?(.+?)(?:\s+button|\s+link|\s+text|\s+element|\s+section|$)/i
  );
  if (actionMatch) {
    searchTerms.push(actionMatch[1].trim());
  }

  if (searchTerms.length > 0) {
    for (const [path, fileInfo] of Object.entries(manifest.files)) {
      if (!path.includes(".jsx") && !path.includes(".tsx")) continue;

      const content = fileInfo.content.toLowerCase();

      for (const term of searchTerms) {
        if (content.includes(term.toLowerCase())) {
          files.push(path);
          break;
        }
      }
    }
  }

  if (files.length === 0) {
    return findComponentFiles(prompt, manifest);
  }

  return [files[0]];
}

function extractComponentNames(prompt: string): string[] {
  const words: string[] = [];

  const cleanPrompt = prompt
    .replace(
      /\b(the|a|an|in|on|to|from|update|change|modify|edit|fix|make)\b/gi,
      ""
    )
    .toLowerCase();

  const matches = cleanPrompt.match(/\b\w+\b/g) || [];

  for (const match of matches) {
    if (match.length > 2) {
      words.push(match);
    }
  }

  return words;
}

function getSuggestedContext(
  targetFiles: string[],
  manifest: FileManifest
): string[] {
  const allFiles = Object.keys(manifest.files);
  return allFiles.filter((file) => !targetFiles.includes(file));
}

function calculateConfidence(
  prompt: string,
  pattern: IntentPattern,
  targetFiles: string[]
): number {
  let confidence = 0.5;

  if (targetFiles.length > 0 && targetFiles[0] !== "") {
    confidence += 0.2;
  }

  if (prompt.split(" ").length > 5) {
    confidence += 0.1;
  }

  for (const regex of pattern.patterns) {
    if (regex.test(prompt)) {
      confidence += 0.2;
      break;
    }
  }

  return Math.min(confidence, 1.0);
}

function generateDescription(
  type: EditType,
  _prompt: string,
  targetFiles: string[]
): string {
  const fileNames = targetFiles.map((f) => f.split("/").pop()).join(", ");

  switch (type) {
    case ET.UPDATE_COMPONENT:
      return `Updating component(s): ${fileNames}`;
    case ET.ADD_FEATURE:
      return `Adding new feature to: ${fileNames}`;
    case ET.FIX_ISSUE:
      return `Fixing issue in: ${fileNames}`;
    case ET.UPDATE_STYLE:
      return `Updating styles in: ${fileNames}`;
    case ET.REFACTOR:
      return `Refactoring: ${fileNames}`;
    case ET.FULL_REBUILD:
      return "Rebuilding entire application";
    case ET.ADD_DEPENDENCY:
      return "Adding new dependency";
    default:
      return `Editing: ${fileNames}`;
  }
}

