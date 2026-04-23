import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentContext();
  if (!ctx || !ctx.organization) redirect("/login");

  const role = (ctx.role ?? "broker") as "admin" | "broker" | "investor";
  const branding = ctx.organization.brandingProfile;

  return (
    <AppShell
      role={role}
      userLabel={ctx.user.name ?? ctx.user.email}
      orgName={ctx.organization.name}
      branding={{
        primaryColor: branding?.primaryColor ?? "#0E2A35",
        accentColor: branding?.accentColor ?? "#E4B43C",
      }}
    >
      {children}
    </AppShell>
  );
}
