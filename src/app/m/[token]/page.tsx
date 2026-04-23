import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import PublicMarketSheet from "@/components/PublicMarketSheet";

export const dynamic = "force-dynamic";

export default async function PublicMarketSheetPage({ params }: { params: { token: string } }) {
  const share = await prisma.marketSheetShare.findUnique({ where: { shareToken: params.token } });
  if (!share) notFound();
  if (share.shareExpiresAt && share.shareExpiresAt < new Date()) {
    return <div className="p-10 text-center text-sm text-slate-500">Este enlace ha expirado.</div>;
  }

  // Fire-and-forget view counter
  prisma.marketSheetShare.update({ where: { id: share.id }, data: { viewsCount: { increment: 1 } } }).catch(() => {});

  const snapshot = JSON.parse(share.snapshotJson);

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:py-0">
      <div className="mx-auto max-w-6xl px-4 pb-3 text-right print:hidden">
        <a href={`/m/${params.token}/pdf`} className="btn-secondary">📄 Descargar PDF</a>
      </div>
      <PublicMarketSheet snapshot={snapshot} />
    </div>
  );
}
