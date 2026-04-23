import { NextResponse } from "next/server";
import { requireContext } from "@/lib/auth";
import { uploadFile } from "@/server/services/storage";
import { parseSeduviPdf } from "@/server/services/seduvi-parse";

export const runtime = "nodejs";

/**
 * Upload a SEDUVI "Ficha de uso de suelo" PDF. Store the file and auto-extract
 * the structured fields (cuenta catastral, uso de suelo, superficie, etc.)
 * so they can pre-fill the property form.
 */
export async function POST(req: Request) {
  const ctx = await requireContext();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file missing" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Must be a PDF" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  const stored = await uploadFile(bytes, {
    filename: file.name,
    mimeType: "application/pdf",
    folder: `org-${ctx.organization.id}/seduvi`,
  });

  let extracted: Awaited<ReturnType<typeof parseSeduviPdf>> | null = null;
  let parseError: string | null = null;
  try {
    extracted = await parseSeduviPdf(bytes);
  } catch (err) {
    parseError = err instanceof Error ? err.message : String(err);
    console.warn("[seduvi-parse] failed:", parseError);
  }

  return NextResponse.json({
    ...stored,
    extracted,
    parseError,
  });
}
