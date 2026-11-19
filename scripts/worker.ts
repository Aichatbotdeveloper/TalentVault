/**
 * Long-running CV processing worker for hosts that support persistent processes
 * (or local development). On Vercel, the cron endpoint + post-submission trigger
 * are used instead. Usage: npm run worker
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  // Imported after env is loaded. `server-only` is a no-op outside the React server runtime.
  const { processNextJob } = await import("../src/lib/cv/processor");
  const { purgeOrphanedUploads } = await import("../src/lib/cv/maintenance");
  const intervalMs = Number(process.env.WORKER_POLL_MS ?? 5000);
  let stopping = false;
  process.on("SIGINT", () => (stopping = true));
  process.on("SIGTERM", () => (stopping = true));
  console.log(`[worker] polling every ${intervalMs}ms (AI_PROVIDER=${process.env.AI_PROVIDER ?? "local"})`);
  let lastPurge = 0;
  while (!stopping) {
    try {
      const outcome = await processNextJob();
      if (outcome) {
        console.log(`[worker] job ${outcome.jobId} -> ${outcome.status}${outcome.error ? ` (${outcome.error})` : ""}`);
        continue;
      }
      if (Date.now() - lastPurge > 3600_000) {
        const n = await purgeOrphanedUploads();
        if (n) console.log(`[worker] purged ${n} orphaned uploads`);
        lastPurge = Date.now();
      }
    } catch (err) {
      console.error("[worker] error", err);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.log("[worker] stopped");
}

main();
