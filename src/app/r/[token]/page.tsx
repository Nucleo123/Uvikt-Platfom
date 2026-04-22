import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ReportView from "@/components/ReportView";
import type { ReportSnapshot } from "@/server/services/report";

export const dynamic = "force-dynamic";

export default async function PublicReportPage({ params }: { params: { token: string } }) {
  const report = await prisma.generatedReport.findUnique({ where: { shareToken: params.token } });
  if (!report || !report.publicAllowed) notFound();
  if (report.shareExpiresAt && report.shareExpiresAt < new Date()) {
    return <div className="p-10 text-center text-sm text-slate-500">Este enlace ha expirado.</div>;
  }

  // Fire-and-forget view counter
  prisma.generatedReport.update({ where: { id: report.id }, data: { viewsCount: { increment: 1 } } }).catch(() => {});

  const snapshot = JSON.parse(report.snapshotJson) as ReportSnapshot;

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="mx-auto max-w-5xl px-4 pb-3 text-right">
        <a href={`/r/${params.token}/pdf`} className="btn-secondary">Descargar PDF</a>
      </div>
      <ReportView snapshot={snapshot} />
    </div>
  );
}
