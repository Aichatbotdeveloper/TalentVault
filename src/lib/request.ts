import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/** One-way hash of the client IP (no raw IPs are stored). */
export async function clientIpHash(): Promise<string> {
  const salt = process.env.IP_HASH_SALT ?? "talentvault-dev-salt";
  return createHash("sha256").update(`${salt}:${await clientIp()}`).digest("hex").slice(0, 32);
}

export async function userAgent(): Promise<string> {
  return ((await headers()).get("user-agent") ?? "").slice(0, 300);
}
