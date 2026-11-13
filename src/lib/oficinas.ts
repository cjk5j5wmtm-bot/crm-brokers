/** Lista de oficinas (variable OFICINAS en Netlify, separadas por coma). Si está vacía, cada asesor la escribe a mano. */
export const oficinas = () => (process.env.OFICINAS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
