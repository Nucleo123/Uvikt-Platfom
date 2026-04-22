import { enrichProperty } from "./enrichment";

/**
 * Job queue abstraction. MVP defaults to "inline" (run jobs in the same process
 * after the request returns via `setImmediate`). Swap for BullMQ in production
 * by implementing the same `enqueue` surface.
 */

type JobKind = "enrich_property";

async function runJob(kind: JobKind, payload: { propertyId: string }) {
  if (kind === "enrich_property") {
    await enrichProperty(payload.propertyId);
    return;
  }
}

export async function enqueue(kind: JobKind, payload: { propertyId: string }) {
  const driver = process.env.QUEUE_DRIVER || "inline";

  if (driver === "inline") {
    // Fire-and-forget: let the request complete while enrichment runs.
    setImmediate(async () => {
      try {
        await runJob(kind, payload);
      } catch (err) {
        console.error(`[queue] ${kind} failed:`, err);
      }
    });
    return { enqueued: true, driver };
  }

  // TODO: BullMQ implementation — push onto a named queue and await ack.
  throw new Error(`Queue driver "${driver}" not implemented. Add BullMQ hookup.`);
}

export const jobs = { runJob };
