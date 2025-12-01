export type FileType =
  | "component"
  | "page"
  | "style"
  | "config"
  | "utility"
  | "layout"
  | "hook"
  | "context";

export interface FileInfo {
  content: string;
  type: FileType;
  exports?: string[];
  imports?: ImportInfo[];
  lastModified: number;
  componentInfo?: ComponentInfo;
  path: string;
  relativePath: string;
}

export interface ImportInfo {
  source: string;
  imports: string[];
  defaultImport?: string;
  isLocal: boolean;
}

export interface ComponentInfo {
  name: string;
  props?: string[];
  hooks?: string[];
  hasState: boolean;
  childComponents?: string[];
}

export interface RouteInfo {
  path: string;
  component: string;
  layout?: string;
}

export interface ComponentTree {
  [componentName: string]: {
    file: string;
    imports: string[];
    importedBy: string[];
    type: "page" | "layout" | "component";
  };
}

export interface FileManifest {
  files: Record<string, FileInfo>;
  routes: RouteInfo[];
  componentTree: ComponentTree;
  entryPoint: string;
  styleFiles: string[];
  timestamp: number;
}

export enum EditType {
  UPDATE_COMPONENT = "UPDATE_COMPONENT",
  ADD_FEATURE = "ADD_FEATURE",
  FIX_ISSUE = "FIX_ISSUE",
  REFACTOR = "REFACTOR",
  FULL_REBUILD = "FULL_REBUILD",
  UPDATE_STYLE = "UPDATE_STYLE",
  ADD_DEPENDENCY = "ADD_DEPENDENCY",
}

export interface EditIntent {
  type: EditType;
  targetFiles: string[];
  confidence: number;
  description: string;
  suggestedContext: string[];
}

export interface IntentPattern {
  patterns: RegExp[];
  type: EditType;
  fileResolver: (prompt: string, manifest: FileManifest) => string[];
}

export interface ManifestFile {
  path: string;
  content: string;
  type: FileType;
}

