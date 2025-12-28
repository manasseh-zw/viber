import type { FileManifest, EditIntent, EditType } from "../types/files";
import { EditType as ET } from "../types/files";
import { analyzeEditIntent } from "./intent-analyzer";
import {
  getEditExamplesPrompt,
  getComponentPatternPrompt,
} from "./edit-examples";

export interface FileContext {
  primaryFiles: string[];
  contextFiles: string[];
  systemPrompt: string;
  editIntent: EditIntent;
}

export async function selectFilesForEdit(
  userPrompt: string,
  manifest: FileManifest
): Promise<FileContext> {
  console.log("[Context Selector] Starting file selection", {
    prompt: userPrompt.substring(0, 100),
    filesCount: Object.keys(manifest.files).length,
    entryPoint: manifest.entryPoint,
  });

  const editIntent = analyzeEditIntent(userPrompt, manifest);

  console.log("[Context Selector] Intent analysis complete", {
    editIntent,
  });

  const primaryFiles = editIntent.targetFiles;
  const allFiles = Object.keys(manifest.files);
  let contextFiles = allFiles.filter((file) => !primaryFiles.includes(file));

  const keyFiles: string[] = [];

  const appFile = allFiles.find(
    (f) => f.endsWith("App.jsx") || f.endsWith("App.tsx")
  );
  if (appFile && !primaryFiles.includes(appFile)) {
    keyFiles.push(appFile);
  }

  const tailwindConfig = allFiles.find(
    (f) => f.endsWith("tailwind.config.js") || f.endsWith("tailwind.config.ts")
  );
  if (tailwindConfig && !primaryFiles.includes(tailwindConfig)) {
    keyFiles.push(tailwindConfig);
  }

  const indexCss = allFiles.find(
    (f) => f.endsWith("index.css") || f.endsWith("globals.css")
  );
  if (indexCss && !primaryFiles.includes(indexCss)) {
    keyFiles.push(indexCss);
  }

  const packageJson = allFiles.find((f) => f.endsWith("package.json"));
  if (packageJson && !primaryFiles.includes(packageJson)) {
    keyFiles.push(packageJson);
  }

  contextFiles = [
    ...keyFiles,
    ...contextFiles.filter((f) => !keyFiles.includes(f)),
  ];

  const systemPrompt = buildSystemPrompt(
    userPrompt,
    editIntent,
    primaryFiles,
    contextFiles,
    manifest
  );

  const fileContext: FileContext = {
    primaryFiles,
    contextFiles,
    systemPrompt,
    editIntent,
  };

  console.log("[Context Selector] File context prepared", {
    primaryFilesCount: primaryFiles.length,
    contextFilesCount: contextFiles.length,
    systemPromptLength: systemPrompt.length,
    primaryFiles,
    contextFiles: contextFiles.slice(0, 5),
  });

  return fileContext;
}

function buildSystemPrompt(
  userPrompt: string,
  editIntent: EditIntent,
  primaryFiles: string[],
  contextFiles: string[],
  manifest: FileManifest
): string {
  const sections: string[] = [];

  if (editIntent.type !== ET.FULL_REBUILD) {
    sections.push(getEditExamplesPrompt());
  }

  sections.push(`## Edit Intent
Type: ${editIntent.type}
Description: ${editIntent.description}
Confidence: ${(editIntent.confidence * 100).toFixed(0)}%

User Request: "${userPrompt}"`);

  sections.push(buildFileStructureSection(manifest));

  const fileList = Object.keys(manifest.files)
    .map((f) => f.replace("/home/user/app/", ""))
    .join("\n");
  sections.push(getComponentPatternPrompt(fileList));

  if (primaryFiles.length > 0) {
    sections.push(`## Files to Edit
${primaryFiles
  .map((f) => {
    const fileInfo = manifest.files[f];
    return `- ${f}${fileInfo?.componentInfo ? ` (${fileInfo.componentInfo.name} component)` : ""}`;
  })
  .join("\n")}`);
  }

  if (contextFiles.length > 0) {
    sections.push(`## Context Files (for reference only)
${contextFiles
  .map((f) => {
    const fileInfo = manifest.files[f];
    return `- ${f}${fileInfo?.componentInfo ? ` (${fileInfo.componentInfo.name} component)` : ""}`;
  })
  .join("\n")}`);
  }

  sections.push(buildEditInstructions(editIntent.type));

  if (
    editIntent.type === ET.UPDATE_COMPONENT ||
    editIntent.type === ET.ADD_FEATURE
  ) {
    sections.push(buildComponentRelationships(primaryFiles, manifest));
  }

  return sections.join("\n\n");
}

function buildFileStructureSection(manifest: FileManifest): string {
  const allFiles = Object.entries(manifest.files)
    .map(([path]) => path.replace("/home/user/app/", ""))
    .filter((path) => !path.includes("node_modules"))
    .sort();

  const componentFiles = Object.entries(manifest.files)
    .filter(([, info]) => info.type === "component" || info.type === "page")
    .map(([path, info]) => ({
      path: path.replace("/home/user/app/", ""),
      name: info.componentInfo?.name || path.split("/").pop(),
      type: info.type,
    }));

  return `## 🚨 EXISTING PROJECT FILES - DO NOT CREATE NEW FILES WITH SIMILAR NAMES 🚨

### ALL PROJECT FILES (${allFiles.length} files)
\`\`\`
${allFiles.join("\n")}
\`\`\`

### Component Files (USE THESE EXACT NAMES)
${componentFiles.map((f) => `- ${f.name} → ${f.path} (${f.type})`).join("\n")}

### CRITICAL: Component Relationships
**ALWAYS CHECK App.jsx FIRST** to understand what components exist and how they're imported!

Common component overlaps to watch for:
- "nav" or "navigation" → Often INSIDE Header.jsx, not a separate file
- "menu" → Usually part of Header/Nav, not separate
- "logo" → Typically in Header, not standalone

When user says "nav" or "navigation":
1. First check if Header.jsx exists
2. Look inside Header.jsx for navigation elements
3. Only create Nav.jsx if navigation doesn't exist anywhere

Entry Point: ${manifest.entryPoint}

### Routes
${
  manifest.routes
    .map((r) => `- ${r.path} → ${r.component.split("/").pop()}`)
    .join("\n") || "No routes detected"
}`;
}

function buildEditInstructions(editType: EditType): string {
  const instructions: Record<EditType, string> = {
    [ET.UPDATE_COMPONENT]: `## SURGICAL EDIT INSTRUCTIONS
- You MUST preserve 99% of the original code
- ONLY edit the specific component(s) mentioned
- Make ONLY the minimal change requested
- DO NOT rewrite or refactor unless explicitly asked
- DO NOT remove any existing code unless explicitly asked
- DO NOT change formatting or structure
- Preserve all imports and exports
- Maintain the existing code style
- Return the COMPLETE file with the surgical change applied
- Think of yourself as a surgeon making a precise incision, not an artist repainting`,

    [ET.ADD_FEATURE]: `## Instructions
- Create new components in appropriate directories
- IMPORTANT: Update parent components to import and use the new component
- Update routing if adding new pages
- Follow existing patterns and conventions
- Add necessary styles to match existing design
- Example workflow:
  1. Create NewComponent.jsx
  2. Import it in the parent: import NewComponent from './NewComponent'
  3. Use it in the parent's render: <NewComponent />`,

    [ET.FIX_ISSUE]: `## Instructions
- Identify and fix the specific issue
- Test the fix doesn't break other functionality
- Preserve existing behavior except for the bug
- Add error handling if needed`,

    [ET.UPDATE_STYLE]: `## SURGICAL STYLE EDIT INSTRUCTIONS
- Change ONLY the specific style/class mentioned
- If user says "change background to blue", change ONLY the background class
- DO NOT touch any other styles, classes, or attributes
- DO NOT refactor or "improve" the styling
- DO NOT change the component structure
- Preserve ALL other classes and styles exactly as they are
- Return the COMPLETE file with only the specific style change`,

    [ET.REFACTOR]: `## Instructions
- Improve code quality without changing functionality
- Follow project conventions
- Maintain all existing features
- Improve readability and maintainability`,

    [ET.FULL_REBUILD]: `## Instructions
- You may rebuild the entire application
- Keep the same core functionality
- Improve upon the existing design
- Use modern best practices`,

    [ET.ADD_DEPENDENCY]: `## Instructions
- Update package.json with new dependency
- Add necessary import statements
- Configure the dependency if needed
- Update any build configuration`,
  };

  return instructions[editType] || instructions[ET.UPDATE_COMPONENT];
}

function buildComponentRelationships(
  files: string[],
  manifest: FileManifest
): string {
  const relationships: string[] = ["## Component Relationships"];

  for (const file of files) {
    const fileInfo = manifest.files[file];
    if (!fileInfo?.componentInfo) continue;

    const componentName = fileInfo.componentInfo.name;
    const treeNode = manifest.componentTree[componentName];

    if (treeNode) {
      relationships.push(`\n### ${componentName}`);

      if (treeNode.imports.length > 0) {
        relationships.push(`Imports: ${treeNode.imports.join(", ")}`);
      }

      if (treeNode.importedBy.length > 0) {
        relationships.push(`Used by: ${treeNode.importedBy.join(", ")}`);
      }

      if (fileInfo.componentInfo.childComponents?.length) {
        relationships.push(
          `Renders: ${fileInfo.componentInfo.childComponents.join(", ")}`
        );
      }
    }
  }

  return relationships.join("\n");
}

export async function getFileContents(
  files: string[],
  manifest: FileManifest
): Promise<Record<string, string>> {
  const contents: Record<string, string> = {};

  for (const file of files) {
    const fileInfo = manifest.files[file];
    if (fileInfo) {
      contents[file] = fileInfo.content;
    }
  }

  return contents;
}

export function formatFilesForAI(
  primaryFiles: Record<string, string>,
  contextFiles: Record<string, string>
): string {
  const sections: string[] = [];

  sections.push("## Files to Edit (ONLY OUTPUT THESE FILES)\n");
  sections.push(
    "🚨 You MUST ONLY generate the files listed below. Do NOT generate any other files! 🚨\n"
  );
  sections.push(
    '⚠️ CRITICAL: Return the COMPLETE file - NEVER truncate with "..." or skip any lines! ⚠️\n'
  );
  sections.push(
    "The file MUST include ALL imports, ALL functions, ALL JSX, and ALL closing tags.\n\n"
  );
  for (const [path, content] of Object.entries(primaryFiles)) {
    sections.push(`### ${path}
**IMPORTANT: This is the COMPLETE file. Your output must include EVERY line shown below, modified only where necessary.**
\`\`\`${getFileExtension(path)}
${content}
\`\`\`
`);
  }

  if (Object.keys(contextFiles).length > 0) {
    sections.push("\n## Context Files (Reference Only - Do Not Edit)\n");
    for (const [path, content] of Object.entries(contextFiles)) {
      let truncatedContent = content;
      if (content.length > 2000) {
        truncatedContent =
          content.substring(0, 2000) +
          "\n// ... [truncated for context length]";
      }

      sections.push(`### ${path}
\`\`\`${getFileExtension(path)}
${truncatedContent}
\`\`\`
`);
    }
  }

  return sections.join("\n");
}

function getFileExtension(path: string): string {
  const ext = path.split(".").pop() || "";
  const mapping: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    css: "css",
    json: "json",
  };
  return mapping[ext] || ext;
}
