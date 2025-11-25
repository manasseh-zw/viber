export interface ManifestFile {
  path: string;
  content: string;
  type: "component" | "page " | "utility" | "style" | "config";
}

export interface FileManifest {
  entryPoint: string;
  files: Record<string, ManifestFile>;
}

export enum EditType {
  UPDATE_COMPONENT = "UPDATE_COMPONENT",
  ADD_FEATURE = "ADD_FEATURE",
  UPDATE_STYLE = "UPDATE_STYLE",
  FIX_ISSUE = "FIX_ISSUE",
  FULL_REBUILD = "FULL_REBUILD",
}

export interface EditIntent {
  type: EditType;
  targetFiles: string[];
  description: string;
  confidence: number;
}
