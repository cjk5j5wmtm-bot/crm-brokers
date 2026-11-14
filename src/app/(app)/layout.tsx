import { requireUser } from "@/lib/server/store";
import { Logo, Wordmark } from "@/lib/view";
import { logoutAction } from "../(cuenta)/actions";
import { Nav } from "../nav";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "MB";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const dueno = user.dueno;
  const Profile = () => (
    <details className="profile">
      <summary aria-label={`Tu cuenta: ${user.nombre}`} title={user.nombre}>{initials(user.nombre)}</summary>
      <div className="profile-menu" role="menu">
        <div className="profile-id">
          <b>{user.nombre}</b>
          <span>{user.email}</span>
          <span>Oficina {user.oficina}</span>
          <span className={`chip ${dueno ? "info" : ""} role`}>{dueno ? "Dueño" : "Asesor"}</span>
        </div>
        <a className="menu-item" href="/cuenta" role="menuitem">Mi perfil</a>
        <a className="menu-item" href="/estadisticas" role="menuitem">Mis estadísticas</a>
        {dueno && <a className="menu-item" href="/general" role="menuitem">General (todo el equipo)</a>}
        <form action={logoutAction}><button className="menu-item danger" type="submit" role="menuitem">Cerrar sesión</button></form>
      </div>
    </details>
  );
  return (
    <>
      <div className="shell">
        <aside className="side">
          <div className="side-top">
            <a className="brand" href="/"><Logo size={34} /> <Wordmark /></a>
            <Profile />
          </div>
          <Nav dueno={dueno} />
        </aside>
        <main>
          <div className="topbar">
            <div className="account">
              <div className="account-name"><b>{user.nombre}</b><span>{user.oficina} · {dueno ? "Dueño" : "Asesor"}</span></div>
              <Profile />
            </div>
          </div>
          {children}
        </main>
      </div>
      <Nav variant="tabbar" dueno={dueno} />
    </>
  );
}
