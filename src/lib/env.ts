import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  AI_PROVIDER: z.enum(["anthropic", "local"]).default("local"),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("claude-opus-5-5"),
  EMAIL_PROVIDER: z.enum(["resend", "console"]).default("console"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("TalentVault <no-reply@talentvault.example>"),
  ADMIN_NOTIFICATION_EMAILS: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  IP_HASH_SALT: z.string().default("talentvault-dev-salt"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

/** Validated server-side environment. Throws a readable error on misconfiguration. */
export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function siteUrl(path = ""): string {
  return new URL(path, env().NEXT_PUBLIC_SITE_URL).toString();
}
