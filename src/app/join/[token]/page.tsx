import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import AcceptInvitationForm from "@/components/AcceptInvitationForm";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: { token: string } }) {
  const inv = await prisma.invitation.findUnique({ where: { token: params.token } });
  if (!inv) notFound();
  if (inv.acceptedAt) {
    return <div className="p-10 text-center text-sm text-slate-500">Esta invitación ya fue aceptada. <a href="/login" className="underline">Ingresa</a>.</div>;
  }
  if (inv.expiresAt < new Date()) {
    return <div className="p-10 text-center text-sm text-slate-500">Esta invitación ha expirado. Pide una nueva a tu administrador.</div>;
  }

  const org = await prisma.organization.findUnique({ where: { id: inv.organizationId } });
  const existingUser = await prisma.user.findUnique({ where: { email: inv.email.toLowerCase() } });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-card">
        <h1 className="mb-1 text-2xl font-semibold">Únete a {org?.name ?? "tu organización"}</h1>
        <p className="mb-6 text-sm text-slate-500">
          Fuiste invitado como <span className="font-medium">{labelForRole(inv.role)}</span> al correo{" "}
          <span className="font-medium">{inv.email}</span>.
        </p>
        <AcceptInvitationForm token={params.token} email={inv.email} isExistingUser={!!existingUser} />
      </div>
    </main>
  );
}

function labelForRole(r: string) {
  return { admin: "Admin", broker: "Bróker", investor: "Inversionista" }[r] ?? r;
}
