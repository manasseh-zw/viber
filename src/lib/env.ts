function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

export const appEnv = {
  // AI Configuration
  GEMINI_API_KEY: requireEnv("GEMINI_API_KEY"),
  DEFAULT_MODEL: optionalEnv("DEFAULT_MODEL", "gemini-2.0-flash"),

  // Sandbox Configuration
  E2B_API_KEY: requireEnv("E2B_API_KEY"),

  // Morph Fast Apply (Optional - for surgical edits)
  MORPH_API_KEY: optionalEnv("MORPH_API_KEY"),

  // 11Labs Voice Agent
  ELEVENLABS_API_KEY: optionalEnv("ELEVENLABS_API_KEY"),
  ELEVENLABS_AGENT_ID: optionalEnv("ELEVENLABS_AGENT_ID"),
} as const;

export type AppEnv = typeof appEnv;
