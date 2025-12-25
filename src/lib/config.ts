export const appConfig = {
  // Daytona Sandbox Configuration (Primary)
  daytona: {
    snapshotName: "viber-workspace-template",
    workingDirectory: "/home/daytona/app",
    devPort: 3000,
    devStartupDelay: 5000,
    devRestartDelay: 3000,
    // Auto-stop sandbox after N minutes of inactivity (0 = disabled)
    autoStopIntervalMinutes: 30,
    // Auto-delete sandbox after being stopped for N minutes
    // 0 = delete immediately when stopped, -1 = never auto-delete
    autoDeleteIntervalMinutes: 0,
    // Custom preview proxy domain (set to enable warning-free previews)
    // Format: {port}-{sandboxId}.{proxyDomain}
    // Leave empty to use default Daytona preview URLs
    previewProxyDomain: "preview.viber.lol",
  },

  // E2B Sandbox Configuration (Legacy - for rollback)
  e2b: {
    timeoutMinutes: 10,
    get timeoutMs() {
      return this.timeoutMinutes * 60 * 1000;
    },
    vitePort: 5173,
    viteStartupDelay: 15000,
    workingDirectory: "/home/user/app",
  },

  ai: {
    defaultModel: "gemini-3-pro", // Best balance for default use
    availableModels: [
      "gemini-3-pro",
      "gemini-3-flash",
      "gemini-2.0-flash",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
    ], // The updated Top 3
    modelDisplayNames: {
      "gemini-3-pro": "Gemini 3 Pro",
      "gemini-3-flash": "Gemini 3 Flash",
      "gemini-2.0-flash": "Gemini 2.0 Flash",
      "gemini-2.5-flash": "Gemini 2.5 Flash",
      "gemini-2.5-pro": "Gemini 2.5 Pro",
    } as Record<string, string>,
    defaultTemperature: 0.7,
    maxTokens: 16000,
    truncationRecoveryMaxTokens: 4000,
  },

  // Code Application Configuration
  codeApplication: {
    defaultRefreshDelay: 2000,
    packageInstallRefreshDelay: 5000,
    enableTruncationRecovery: false,
    maxTruncationRecoveryAttempts: 1,
  },

  // UI Configuration
  ui: {
    showModelSelector: true,
    showStatusIndicator: true,
    animationDuration: 200,
    toastDuration: 3000,
    maxChatMessages: 100,
    maxRecentMessagesContext: 20,
  },

  // Development Configuration
  dev: {
    enableDebugLogging: true,
    enablePerformanceMonitoring: false,
    logApiResponses: true,
  },

  // Package Installation Configuration
  packages: {
    useLegacyPeerDeps: true,
    installTimeout: 60000,
    autoRestartVite: true,
  },

  // File Management Configuration
  files: {
    excludePatterns: [
      "node_modules/**",
      ".git/**",
      "dist/**",
      "build/**",
      "*.log",
      ".DS_Store",
    ],
    maxFileSize: 1024 * 1024,
    textFileExtensions: [
      ".js",
      ".jsx",
      ".ts",
      ".tsx",
      ".css",
      ".scss",
      ".sass",
      ".html",
      ".xml",
      ".svg",
      ".json",
      ".yml",
      ".yaml",
      ".md",
      ".txt",
      ".env",
      ".gitignore",
      ".dockerignore",
    ],
  },

  // API Configuration
  api: {
    maxRetries: 3,
    retryDelay: 1000,
    requestTimeout: 30000,
  },
} as const;

export function getConfig<K extends keyof typeof appConfig>(
  key: K
): (typeof appConfig)[K] {
  return appConfig[key];
}

export function getConfigValue(path: string): unknown {
  return path.split(".").reduce((obj: unknown, key) => {
    if (obj && typeof obj === "object" && key in obj) {
      return (obj as Record<string, unknown>)[key];
    }
    return undefined;
  }, appConfig as unknown);
}

export default appConfig;
