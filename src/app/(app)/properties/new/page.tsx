import { requireContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AcquisitionWizard from "@/components/AcquisitionWizard";

export default async function NewPropertyPage() {
  const ctx = await requireContext();
  const memberships = await prisma.organizationMembership.findMany({
    where: { organizationId: ctx.organization.id },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  const members = memberships.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email }));

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Nuevo inmueble</h1>
        <p className="text-sm text-slate-500">Carga un inmueble potencial para compra. Se te asignará un número de ticket.</p>
      </header>
      <AcquisitionWizard members={members} />
    </div>
  );
}
