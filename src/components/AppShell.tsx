"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LogoutButton from "./LogoutButton";
import { cn } from "@/lib/utils";

type Role = "admin" | "broker" | "investor";

type Item = { href: string; label: string; roles?: Role[] };

const NAV: Item[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/adquisiciones", label: "Adquisiciones" },
  { href: "/properties", label: "Inmuebles" },
  { href: "/properties/new", label: "Nuevo inmueble" },
  { href: "/pipeline", label: "Pipeline inversionista", roles: ["admin", "investor"] },
];

const ADMIN: Item[] = [
  { href: "/admin/branding", label: "Branding", roles: ["admin"] },
  { href: "/admin/sources",  label: "Fuentes de datos", roles: ["admin"] },
  { href: "/admin/users",    label: "Usuarios", roles: ["admin"] },
  { href: "/admin/audit",    label: "Actividad", roles: ["admin"] },
  { href: "/admin/market",   label: "Mercado", roles: ["admin"] },
];

export default function AppShell({
  children,
  role,
  userLabel,
  orgName,
  branding,
}: {
  children: React.ReactNode;
  role: Role;
  userLabel: string;
  orgName: string;
  branding: { primaryColor: string; accentColor: string };
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  const visible = NAV.filter((i) => !i.roles || i.roles.includes(role));
  const admin = ADMIN.filter((i) => !i.roles || i.roles.includes(role));

  const navBody = (
    <>
      <Link href="/dashboard" onClick={() => setDrawer(false)} className="mb-8 flex items-center gap-2 font-semibold">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: branding.primaryColor }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2a7 7 0 017 7c0 4.5-7 13-7 13S5 13.5 5 9a7 7 0 017-7z" fill={branding.accentColor} />
          </svg>
        </span>
        UVIKT
      </Link>

      <nav className="flex flex-1 flex-col gap-1 text-sm">
        {visible.map((i) => <NavLink key={i.href} item={i} active={pathname === i.href || (i.href !== "/dashboard" && pathname.startsWith(i.href))} onNav={() => setDrawer(false)} />)}
        {admin.length > 0 && (
          <>
            <div className="mt-4 text-[10px] uppercase tracking-widest text-slate-400">Admin</div>
            {admin.map((i) => <NavLink key={i.href} item={i} active={pathname.startsWith(i.href)} onNav={() => setDrawer(false)} />)}
          </>
        )}
      </nav>

      <div className="mt-auto border-t border-slate-200 pt-4">
        <div className="text-sm font-medium">{userLabel}</div>
        <div className="text-xs text-slate-500">{orgName}</div>
        <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">rol: {role}</div>
        <LogoutButton />
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <button onClick={() => setDrawer(true)} aria-label="Abrir menú" className="rounded-lg p-2 hover:bg-slate-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <Link href="/dashboard" className="font-semibold">UVIKT</Link>
        <div className="w-9" />
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-200 bg-white p-5 md:flex">
        {navBody}
      </aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-30 md:hidden", drawer ? "pointer-events-auto" : "pointer-events-none")}>
        <div className={cn("absolute inset-0 bg-black/40 transition-opacity", drawer ? "opacity-100" : "opacity-0")} onClick={() => setDrawer(false)} />
        <aside className={cn("absolute inset-y-0 left-0 flex w-72 flex-col bg-white p-5 shadow-2xl transition-transform", drawer ? "translate-x-0" : "-translate-x-full")}>
          {navBody}
        </aside>
      </div>

      <main className="md:pl-60">{children}</main>
    </div>
  );
}

function NavLink({ item, active, onNav }: { item: Item; active: boolean; onNav: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNav}
      className={cn(
        "rounded-lg px-3 py-2 transition",
        active ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-100 hover:text-ink",
      )}
    >
      {item.label}
    </Link>
  );
}
