import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { purgeOrphanedUploads } from "@/lib/cv/maintenance";
import { processQueuedJobs } from "@/lib/cv/processor";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function authorised(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return header.length === expected.length && timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

/** Scheduled queue drain (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`). */
export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const outcomes = await processQueuedJobs({ maxJobs: 5, timeBudgetMs: 240_000 });
  const purged = await purgeOrphanedUploads();
  return NextResponse.json({ processed: outcomes.length, outcomes: outcomes.map(({ jobId, status }) => ({ jobId, status })), purgedUploads: purged });
}
