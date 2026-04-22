import PropertyWizard from "@/components/PropertyWizard";

export default function NewPropertyPage() {
  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Nueva propiedad</h1>
        <p className="text-sm text-slate-500">Dispara. Valida. Personaliza. Envía.</p>
      </header>
      <PropertyWizard />
    </div>
  );
}
