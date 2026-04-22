/**
 * Standalone worker entrypoint. In production run with `npm run worker`
 * in a separate process alongside the Next.js server. Dev uses the inline
 * queue driver so this script is not required locally.
 */

import { prisma } from "@/lib/db";
import { jobs } from "./queue";

async function main() {
  const driver = process.env.QUEUE_DRIVER || "inline";
  console.log(`[worker] starting with driver=${driver}`);

  if (driver !== "bullmq") {
    console.log("[worker] inline driver — this worker only processes backlog pending jobs.");
  }

  // Process any PropertyEnrichmentJob rows stuck in "pending" or "running" > 10m
  const stale = await prisma.propertyEnrichmentJob.findMany({
    where: { status: { in: ["pending", "running"] } },
    orderBy: { scheduledAt: "asc" },
    take: 25,
  });
  console.log(`[worker] found ${stale.length} stale/pending jobs`);

  for (const job of stale) {
    if (job.source === "all" || job.source) {
      try {
        await jobs.runJob("enrich_property", { propertyId: job.propertyId });
      } catch (err) {
        console.error(`[worker] job ${job.id} failed:`, err);
      }
    }
  }

  console.log("[worker] done.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
