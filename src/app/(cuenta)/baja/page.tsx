import { logoutAction } from "../actions";

export default function Baja() {
  return (
    <>
      <h1>Tu cuenta está dada de baja</h1>
      <p className="muted">Si es un error, hablá con la dirección para que la reactive. Tu historial sigue guardado.</p>
      <form action={logoutAction}><button className="btn ghost big">Salir</button></form>
    </>
  );
}
