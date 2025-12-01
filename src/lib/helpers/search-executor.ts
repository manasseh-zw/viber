export interface SearchResult {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  matchedTerm?: string;
  matchedPattern?: string;
  contextBefore: string[];
  contextAfter: string[];
  confidence: "high" | "medium" | "low";
}

export interface SearchPlan {
  editType: string;
  reasoning: string;
  searchTerms: string[];
  regexPatterns?: string[];
  fileTypesToSearch?: string[];
  expectedMatches?: number;
  fallbackSearch?: {
    terms: string[];
    patterns?: string[];
  };
}

export interface SearchExecutionResult {
  success: boolean;
  results: SearchResult[];
  filesSearched: number;
  executionTime: number;
  usedFallback: boolean;
  error?: string;
}

export function executeSearchPlan(
  searchPlan: SearchPlan,
  files: Record<string, string>
): SearchExecutionResult {
  const startTime = Date.now();
  const results: SearchResult[] = [];
  let filesSearched = 0;
  let usedFallback = false;

  const {
    searchTerms = [],
    regexPatterns = [],
    fileTypesToSearch = [".jsx", ".tsx", ".js", ".ts"],
    fallbackSearch,
  } = searchPlan;

  const performSearch = (
    terms: string[],
    patterns?: string[]
  ): SearchResult[] => {
    const searchResults: SearchResult[] = [];

    for (const [filePath, content] of Object.entries(files)) {
      const shouldSearch = fileTypesToSearch.some((ext) =>
        filePath.endsWith(ext)
      );
      if (!shouldSearch) continue;

      filesSearched++;
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let matched = false;
        let matchedTerm: string | undefined;
        let matchedPattern: string | undefined;

        for (const term of terms) {
          if (line.toLowerCase().includes(term.toLowerCase())) {
            matched = true;
            matchedTerm = term;
            break;
          }
        }

        if (!matched && patterns) {
          for (const pattern of patterns) {
            try {
              const regex = new RegExp(pattern, "i");
              if (regex.test(line)) {
                matched = true;
                matchedPattern = pattern;
                break;
              }
            } catch {
              console.warn(`[file-search] Invalid regex pattern: ${pattern}`);
            }
          }
        }

        if (matched) {
          const contextBefore = lines.slice(Math.max(0, i - 3), i);
          const contextAfter = lines.slice(
            i + 1,
            Math.min(lines.length, i + 4)
          );

          let confidence: "high" | "medium" | "low" = "medium";

          if (matchedTerm && line.includes(matchedTerm)) {
            confidence = "high";
          } else if (
            line.includes("function") ||
            line.includes("export") ||
            line.includes("return")
          ) {
            confidence = "high";
          } else if (matchedPattern) {
            confidence = "medium";
          }

          searchResults.push({
            filePath,
            lineNumber: i + 1,
            lineContent: line.trim(),
            matchedTerm,
            matchedPattern,
            contextBefore,
            contextAfter,
            confidence,
          });
        }
      }
    }

    return searchResults;
  };

  results.push(...performSearch(searchTerms, regexPatterns));

  if (results.length === 0 && fallbackSearch) {
    console.log(
      "[file-search] No results from primary search, trying fallback..."
    );
    usedFallback = true;
    results.push(
      ...performSearch(fallbackSearch.terms, fallbackSearch.patterns)
    );
  }

  const executionTime = Date.now() - startTime;

  results.sort((a, b) => {
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
  });

  return {
    success: results.length > 0,
    results,
    filesSearched,
    executionTime,
    usedFallback,
    error:
      results.length === 0 ? "No matches found for search terms" : undefined,
  };
}

export function formatSearchResultsForAI(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No search results found.";
  }

  const sections: string[] = [];

  sections.push("🔍 SEARCH RESULTS - EXACT LOCATIONS FOUND:\n");

  const resultsByFile = new Map<string, SearchResult[]>();
  for (const result of results) {
    if (!resultsByFile.has(result.filePath)) {
      resultsByFile.set(result.filePath, []);
    }
    resultsByFile.get(result.filePath)!.push(result);
  }

  for (const [filePath, fileResults] of resultsByFile) {
    sections.push(`\n📄 FILE: ${filePath}`);

    for (const result of fileResults) {
      sections.push(
        `\n  📍 Line ${result.lineNumber} (${result.confidence} confidence)`
      );

      if (result.matchedTerm) {
        sections.push(`     Matched: "${result.matchedTerm}"`);
      } else if (result.matchedPattern) {
        sections.push(`     Pattern: ${result.matchedPattern}`);
      }

      sections.push(`     Code: ${result.lineContent}`);

      if (result.contextBefore.length > 0 || result.contextAfter.length > 0) {
        sections.push(`     Context:`);
        for (const line of result.contextBefore) {
          sections.push(`       ${line}`);
        }
        sections.push(`     → ${result.lineContent}`);
        for (const line of result.contextAfter) {
          sections.push(`       ${line}`);
        }
      }
    }
  }

  sections.push("\n\n🎯 RECOMMENDED ACTION:");

  const bestResult = results[0];
  sections.push(
    `Edit ${bestResult.filePath} at line ${bestResult.lineNumber}`
  );

  return sections.join("\n");
}

export function selectTargetFile(
  results: SearchResult[],
  editType: string
): { filePath: string; lineNumber: number; reason: string } | null {
  if (results.length === 0) return null;

  if (editType === "UPDATE_STYLE") {
    const componentResult = results.find(
      (r) => r.filePath.endsWith(".jsx") || r.filePath.endsWith(".tsx")
    );
    if (componentResult) {
      return {
        filePath: componentResult.filePath,
        lineNumber: componentResult.lineNumber,
        reason: "Found component with style to update",
      };
    }
  }

  if (editType === "REMOVE_ELEMENT") {
    const renderResult = results.find(
      (r) => r.lineContent.includes("return") || r.lineContent.includes("<")
    );
    if (renderResult) {
      return {
        filePath: renderResult.filePath,
        lineNumber: renderResult.lineNumber,
        reason: "Found element to remove in render output",
      };
    }
  }

  const best = results[0];
  return {
    filePath: best.filePath,
    lineNumber: best.lineNumber,
    reason: `Highest confidence match (${best.confidence})`,
  };
}

