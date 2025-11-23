function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  GEMINI_API_KEY: requireEnv("GEMINI_API_KEY"),
  E2B_API_KEY: requireEnv("E2B_API_KEY"),
  DEFAULT_MODEL: requireEnv("DEFAULT_MODEL"),
};
