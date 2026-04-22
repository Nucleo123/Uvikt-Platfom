import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { can } from "@/lib/rbac";
import LogoutButton from "@/components/LogoutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentContext();
  if (!ctx || !ctx.organization) redirect("/login");

  const role = ctx.role ?? "broker";
  const branding = ctx.organization.brandingProfile;

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-200 bg-white p-5 md:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2 font-semibold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: branding?.primaryColor ?? "#0E2A35" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2a7 7 0 017 7c0 4.5-7 13-7 13S5 13.5 5 9a7 7 0 017-7z" fill={branding?.accentColor ?? "#E4B43C"} />
            </svg>
          </span>
          UVIKT
        </Link>

        <nav className="flex flex-1 flex-col gap-1 text-sm">
          <NavLink href="/dashboard" label="Dashboard" />
          <NavLink href="/properties" label="Propiedades" />
          <NavLink href="/properties/new" label="Nueva propiedad" />
          {can(role, "pipeline.manage") && <NavLink href="/pipeline" label="Pipeline inversionista" />}
          <div className="mt-4 text-[10px] uppercase tracking-widest text-slate-400">Admin</div>
          {can(role, "admin.branding") && <NavLink href="/admin/branding" label="Branding" />}
          {can(role, "admin.sources")  && <NavLink href="/admin/sources" label="Fuentes de datos" />}
          {can(role, "admin.users")    && <NavLink href="/admin/users" label="Usuarios" />}
          {can(role, "admin.market")   && <NavLink href="/admin/market" label="Mercado" />}
        </nav>

        <div className="mt-auto border-t border-slate-200 pt-4">
          <div className="text-sm font-medium">{ctx.user.name ?? ctx.user.email}</div>
          <div className="text-xs text-slate-500">{ctx.organization.name}</div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">rol: {role}</div>
          <LogoutButton />
        </div>
      </aside>

      <main className="md:pl-60">{children}</main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-ink">
      {label}
    </Link>
  );
}
