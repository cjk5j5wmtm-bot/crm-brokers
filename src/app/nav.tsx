"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, React.ReactNode> = {
  "/": <><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></>,
  "/clientes": <><circle cx="9" cy="8" r="4" /><path d="M2 21c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5M16 4a4 4 0 0 1 0 8M18 15.5c2 .6 3.3 2.4 4 5.5" /></>,
  "/clientes/nuevo": <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
  "/estadisticas": <><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></>,
  "/direccion": <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
};

/** Menú: lateral en computadora y barra inferior en celular (variant="tabbar"). */
export function Nav({ variant = "side", direccion }: { variant?: "side" | "tabbar"; direccion: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/", label: "Llamadas de hoy", short: "Hoy" },
    { href: "/clientes", label: "Mis clientes", short: "Clientes" },
    { href: "/clientes/nuevo", label: "Nuevo cliente", short: "Nuevo" },
    { href: "/estadisticas", label: "Mis estadísticas", short: "Stats" },
    ...(direccion ? [{ href: "/direccion", label: "Dirección", short: "Dirección" }] : []),
  ];
  return (
    <nav className={variant === "tabbar" ? `tabbar n${items.length}` : "nav"} aria-label="Secciones">
      {items.map((i) => {
        const active = i.href === "/" ? path === "/" : i.href === "/clientes" ? path.startsWith("/clientes") && path !== "/clientes/nuevo" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}>
            <svg width={variant === "tabbar" ? 22 : 18} height={variant === "tabbar" ? 22 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[i.href]}</svg>
            {variant === "tabbar" ? i.short : i.label}
          </Link>
        );
      })}
    </nav>
  );
}
