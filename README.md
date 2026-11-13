# Seguimiento MSZ · CRM interno

CRM de la inmobiliaria: cada asesor carga sus clientes y anota sus llamadas, y la dirección ve la actividad de todos. Está armado igual que AlDia: Next.js, cuentas propias y datos en Netlify Blobs. No usa ningún servicio aparte.

## Qué hace
- **Llamadas de hoy:** cada asesor ve a quién tiene que llamar (las atrasadas primero), con botones para llamar, abrir WhatsApp y anotar la llamada.
- **Cuatro apartados de cliente, cada uno con su plazo de llamada:**
  - Consulta (comprador o interesado): a los 2 días.
  - Propietario: una vez por mes.
  - Inquilino: una vez por mes (puede comprar o mudarse cuando le vence el contrato).
  - Ya compró: cada 2 meses, para pedir referidos.
- **Ficha del cliente:** datos, historial de llamadas y próximo paso. Al anotar una llamada, el próximo llamado se agenda solo.
- **Dirección:** resumen por asesor y por oficina (clientes, llamadas de 30 días, atrasadas y último contacto). Desde ahí puede dar de baja a un asesor, darle el rol de dirección o una contraseña temporal.

## Seguridad
- Cada asesor ve **solo sus clientes**. Sus datos se guardan aparte, y el servidor nunca muestra los de otro.
- La dirección puede ver todo, pero no edita los clientes de los asesores.
- Registro abierto: cualquiera puede crear su cuenta, pero solo ve sus propios clientes. Si querés cerrarlo, cargá `REGISTRO_CODIGO` en Netlify y desde ese momento se pide el código.
- **La primera cuenta que se crea queda como dirección.** Después, la dirección le da ese rol a quien quiera.
- Las contraseñas se guardan con `scrypt` y sal. La sesión es una cookie firmada que dura 30 días.
- Si un asesor se da de baja, deja de poder entrar en el momento, y su historial queda guardado.
- El historial de llamadas no se edita: queda como registro para la dirección.

## Configuración en Netlify (Project configuration > Environment variables)
| Variable | Para qué | Ejemplo |
|---|---|---|
| `REGISTRO_CODIGO` | Opcional. Si lo cargás, el registro pide este código. | `OESTE-7K2P-M9QX` |
| `DIRECCION_EMAILS` | Mails con rol de dirección, separados por coma. | `gerencia@inmobiliaria.com` |
| `OFICINAS` | Oficinas para elegir al registrarse, separadas por coma. | `Castelar,Ramos Mejía,Leloir,CABA,Ituzaingó` |
| `SESSION_SECRET` | Opcional. Si no se pone, se genera solo. | |

Después de cambiar una variable: Deploys > Trigger deploy.

Si el código se filtra, cambiá `REGISTRO_CODIGO` y volvé a publicar. Las cuentas que ya existen siguen funcionando.

## Cómo ejecutarlo en la compu
Requisitos: Node 20 o superior.
```bash
npm install
REGISTRO_CODIGO=PRUEBA DIRECCION_EMAILS=yo@mail.com npm run dev   # http://localhost:3000
npm test
npm run typecheck
```
En la compu, los datos se guardan en `.data/`.

## Límites (a hoy)
- No hay recuperación de contraseña por mail. La dirección le da una contraseña temporal al asesor, y el asesor la cambia desde su perfil.
- No hay exportación a Excel ni importación.
- Los datos de clientes son datos personales (en Argentina, Ley 25.326). Que el abogado de la inmobiliaria revise si hace falta registrar la base o pedir consentimiento.
