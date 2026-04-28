import { requireContext } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import BrandingForm from "@/components/BrandingForm";

export default async function BrandingAdminPage() {
  const ctx = await requireContext();
  assertCan(ctx.role, "admin.branding");
  const branding = ctx.organization.brandingProfile;
  const radii = ctx.organization.demographicRadiiMeters;

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Branding y configuración</h1>
        <p className="text-sm text-slate-500">Define colores, logotipo, datos de contacto y los radios demográficos por defecto.</p>
      </header>
      <BrandingForm
        initial={{
          companyName: branding?.companyName ?? ctx.organization.name,
          logoUrl: branding?.logoUrl ?? "",
          primaryColor: branding?.primaryColor ?? "#0E2A35",
          accentColor: branding?.accentColor ?? "#E4B43C",
          contactEmail: branding?.contactEmail ?? "",
          contactPhone: branding?.contactPhone ?? "",
          footerNote: branding?.footerNote ?? "",
          demographicRadiiMeters: radii,
        }}
      />
    </div>
  );
}
