import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  PORT: z.string().default("4000"),
  DATABASE_URL: z.string(),
  SERVER_ADMIN_TOKEN: z.string(),
  STREAM_HOST: z.string().url(),
  STREAM_APP: z.string().default("live"),
  PLAYBACK_BASE_URL: z.string().url().optional()
});

const parsed = envSchema.parse(process.env);

export const env = {
  port: Number(parsed.PORT),
  databaseUrl: parsed.DATABASE_URL,
  serverAdminToken: parsed.SERVER_ADMIN_TOKEN,
  streamHost: parsed.STREAM_HOST.replace(/\/+$/, ""),
  streamApp: parsed.STREAM_APP,
  playbackBaseUrl: parsed.PLAYBACK_BASE_URL?.replace(/\/+$/, "")
};

export const hlsBaseUrl = `${env.streamHost}/hls`;
