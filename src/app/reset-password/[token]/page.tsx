import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ params }: { params: { token: string } }) {
  const reset = await prisma.passwordResetToken.findUnique({ where: { token: params.token } });
  if (!reset) notFound();
  if (reset.usedAt) {
    return <ExpiredMessage title="Token ya usado" />;
  }
  if (reset.expiresAt < new Date()) {
    return <ExpiredMessage title="Token expirado" />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-card">
        <h1 className="mb-1 text-2xl font-semibold">Nueva contraseña</h1>
        <p className="mb-6 text-sm text-slate-500">Elige una contraseña de al menos 8 caracteres.</p>
        <ResetPasswordForm token={params.token} />
      </div>
    </main>
  );
}

function ExpiredMessage({ title }: { title: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-card text-center">
        <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
        <p className="mb-6 text-sm text-slate-500">Pide un nuevo link de recuperación.</p>
        <a href="/forgot-password" className="btn-primary">Solicitar nuevo link</a>
      </div>
    </main>
  );
}
