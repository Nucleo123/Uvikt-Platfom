import { redirect } from "next/navigation";

export default function PropertiesIndexPage({
  searchParams,
}: {
  searchParams: { view?: string; stage?: string; type?: string; q?: string };
}) {
  const params = new URLSearchParams();
  params.set("view", searchParams.view === "map" ? "mapa" : "lista");
  if (searchParams.stage) params.set("stage", searchParams.stage);
  if (searchParams.type) params.set("type", searchParams.type);
  if (searchParams.q) params.set("q", searchParams.q);
  redirect(`/en-proceso?${params.toString()}`);
}
