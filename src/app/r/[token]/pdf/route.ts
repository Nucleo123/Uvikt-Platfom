import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PDF rendering endpoint.
 *
 * Production: uses Puppeteer (headless Chromium) to print the /r/[token] page
 * to A4 landscape. For serverless deployments, swap to `@sparticuz/chromium`
 * or a remote service like Browserless / PDFShift.
 *
 * If Puppeteer isn't installed locally (no chromium binary), we fall back to
 * returning the report HTML with a small "Print to PDF" hint so the feature
 * still demos. PDF generation is attempted only when `PDF_DRIVER=puppeteer`.
 */
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const report = await prisma.generatedReport.findUnique({ where: { shareToken: params.token } });
  if (!report || !report.publicAllowed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const url = `${base}/r/${params.token}?print=1`;

  const driver = process.env.PDF_DRIVER || "puppeteer";
  if (driver !== "puppeteer") {
    return NextResponse.redirect(url);
  }

  try {
    const puppeteer = (await import("puppeteer")).default;
    const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    const buffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "8mm", bottom: "8mm", left: "8mm", right: "8mm" },
    });
    await browser.close();
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="uvikt-report-${report.id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[pdf] puppeteer failed:", err);
    // Graceful fallback: redirect to the printable HTML view so the broker
    // can still use the browser's Print → Save as PDF.
    return NextResponse.redirect(url, { status: 302 });
  }
}
