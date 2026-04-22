import { NextResponse } from "next/server";
import { requireContext } from "@/lib/auth";
import { uploadFile } from "@/server/services/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ctx = await requireContext();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file missing" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await uploadFile(bytes, {
    filename: file.name,
    mimeType: file.type,
    folder: `org-${ctx.organization.id}/properties`,
  });
  return NextResponse.json(stored);
}
