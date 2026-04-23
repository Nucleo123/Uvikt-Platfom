import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PDF export of the public Ficha de Mercado. Mirrors /r/[token]/pdf.
 * Uses Puppeteer when available (local dev); redirects to print-friendly HTML
 * on serverless environments without Chromium (Vercel by default).
 */
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const share = await prisma.marketSheetShare.findUnique({ where: { shareToken: params.token } });
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (share.shareExpiresAt && share.shareExpiresAt < new Date()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const url = `${base}/m/${params.token}?print=1`;

  if ((process.env.PDF_DRIVER || "puppeteer") !== "puppeteer") return NextResponse.redirect(url);

  try {
    const puppeteer = (await import("puppeteer")).default;
    const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    const buffer = await page.pdf({
      format: "A4", landscape: true, printBackground: true,
      margin: { top: "8mm", bottom: "8mm", left: "8mm", right: "8mm" },
    });
    await browser.close();
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="uvikt-ficha-mercado-${share.propertyId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.warn("[pdf] market-sheet puppeteer unavailable:", err);
    // Graceful fallback: redirect to print-friendly HTML
    return NextResponse.redirect(url, { status: 302 });
  }
}
