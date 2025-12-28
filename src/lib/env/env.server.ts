type AppEnvironment = "development" | "production";

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

function resolveAppEnv(): AppEnvironment {
  const fromNodeEnv = process.env.NODE_ENV?.toLowerCase();

  if (fromNodeEnv === "production") {
    return "production";
  }

  return "development";
}

export const appEnv = {
  // Runtime Environment
  // Derived from NODE_ENV (Render/hosting platforms).
  APP_ENV: resolveAppEnv(),

  // AI Configuration
  GEMINI_API_KEY: requireEnv("GEMINI_API_KEY"),
  DEFAULT_MODEL: optionalEnv("DEFAULT_MODEL", "gemini-3-pro"),

  // Sandbox Configuration
  DAYTONA_API_KEY: requireEnv("DAYTONA_API_KEY"),

  // ElevenLabs Voice Agent
  ELEVENLABS_API_KEY: optionalEnv("ELEVENLABS_API_KEY"),
  ELEVENLABS_AGENT_ID: optionalEnv("VITE_ELEVENLABS_AGENT_ID"),

  // Unsplash
  UNSPLASH_ACCESS_KEY: requireEnv("UNSPLASH_ACCESS_KEY"),
  UNSPLASH_SECRET_KEY: requireEnv("UNSPLASH_SECRET_KEY"),

  // Image CDN base URL (for LLM-generated image src)
  // In development, point this to your ngrok/forwarded URL for this app.
  // In production, set it to your public app domain or leave undefined to use relative /images.
  IMAGE_CDN_BASE_URL: optionalEnv("IMAGE_CDN_BASE_URL"),
} as const;

export type AppEnv = typeof appEnv;

export const isDevEnv = appEnv.APP_ENV === "development";
export const isProdEnv = appEnv.APP_ENV === "production";
