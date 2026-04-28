import { redirect } from "next/navigation";

export default function AdquisicionesPage() {
  redirect("/en-proceso?view=kanban");
}
