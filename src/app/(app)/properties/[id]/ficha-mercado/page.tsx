import { requireContext } from "@/lib/auth";
import { assertOwnsProperty } from "@/lib/tenant";
import MarketSheetView from "@/components/MarketSheetView";

export default async function FichaMercadoPage({ params }: { params: { id: string } }) {
  const ctx = await requireContext();
  await assertOwnsProperty(ctx.organization.id, params.id);

  return (
    <div className="p-6">
      <MarketSheetView propertyId={params.id} />
    </div>
  );
}
