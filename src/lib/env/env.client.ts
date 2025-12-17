type ClientEnvironment = "development" | "production";

function resolveClientEnv(): ClientEnvironment {
  const mode = import.meta.env.MODE?.toLowerCase();
  if (mode === "production") return "production";
  return "development";
}

export const clientEnv = {
  // Runtime Environment (derived from Vite mode)
  APP_ENV: resolveClientEnv(),

  // ElevenLabs Voice Agent (public client-side ID)
  ELEVENLABS_AGENT_ID: import.meta.env.VITE_ELEVENLABS_AGENT_ID as
    | string
    | undefined,
} as const;

export type ClientEnv = typeof clientEnv;

export const isClientDevEnv = clientEnv.APP_ENV === "development";
export const isClientProdEnv = clientEnv.APP_ENV === "production";
