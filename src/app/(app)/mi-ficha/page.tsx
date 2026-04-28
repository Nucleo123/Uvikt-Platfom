import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth";
import BrandingForm from "@/components/BrandingForm";

export default async function MiFichaPage() {
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "broker") redirect("/en-proceso");
  const branding = ctx.organization.brandingProfile;
  const radii = ctx.organization.demographicRadiiMeters;

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Mi ficha</h1>
        <p className="text-sm text-slate-500">Personaliza la presentación de tus reportes: colores, logotipo, datos de contacto y radios demográficos.</p>
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
