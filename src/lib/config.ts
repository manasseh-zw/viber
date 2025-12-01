export const appConfig = {
  // E2B Sandbox Configuration
  e2b: {
    timeoutMinutes: 30,
    get timeoutMs() {
      return this.timeoutMinutes * 60 * 1000;
    },
    vitePort: 5173,
    viteStartupDelay: 10000,
    workingDirectory: "/home/user/app",
  },

  // AI Model Configuration (Gemini only)
  ai: {
    defaultModel: "gemini-2.0-flash",
    availableModels: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    modelDisplayNames: {
      "gemini-2.0-flash": "Gemini 2.0 Flash",
      "gemini-1.5-pro": "Gemini 1.5 Pro",
      "gemini-1.5-flash": "Gemini 1.5 Flash",
    } as Record<string, string>,
    defaultTemperature: 0.7,
    maxTokens: 8000,
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
    useBun: true,
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
