import { requireUser } from "@/lib/server/store";
import { Logo, Wordmark } from "@/lib/view";
import { logoutAction } from "../(cuenta)/actions";
import { Nav } from "../nav";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "MB";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const dir = user.rol === "direccion";
  const Profile = () => (
    <details className="profile">
      <summary aria-label={`Tu cuenta: ${user.nombre}`} title={user.nombre}>{initials(user.nombre)}</summary>
      <div className="profile-menu" role="menu">
        <div className="profile-id"><b>{user.nombre}</b><span>{user.oficina}{dir ? " · Dirección" : ""}</span><span>{user.email}</span></div>
        <a className="menu-item" href="/cuenta" role="menuitem">Cambiar mi contraseña</a>
        <form action={logoutAction}><button className="menu-item danger" type="submit" role="menuitem">Cerrar sesión</button></form>
      </div>
    </details>
  );
  return (
    <>
      <div className="shell">
        <aside className="side">
          <div className="side-top">
            <a className="brand" href="/"><Logo size={26} /> <Wordmark /></a>
            <Profile />
          </div>
          <Nav direccion={dir} />
        </aside>
        <main><div className="topbar"><Profile /></div>{children}</main>
      </div>
      <Nav variant="tabbar" direccion={dir} />
    </>
  );
}
