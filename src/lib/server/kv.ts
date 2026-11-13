import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Guardado clave → JSON (igual que en AlDia).
 * - En Netlify usa Netlify Blobs (persistente, incluido en el plan gratis, sin configurar nada).
 * - En la compu usa archivos en .data/ (o CRM_DATA_DIR).
 * Cada asesor guarda sus datos en una clave propia, así dos asesores nunca se pisan.
 */
const onNetlify = () =>
  !!(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT || process.env.AWS_LAMBDA_FUNCTION_NAME || (globalThis as { netlifyBlobsContext?: unknown }).netlifyBlobsContext);
const DIR = () => process.env.CRM_DATA_DIR || path.join(process.cwd(), ".data");
const fileFor = (key: string) => path.join(DIR(), ...key.split("/").map((p) => encodeURIComponent(p))) + ".json";

async function blobs() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "crm-brokers", consistency: "strong" });
}

export async function kvGet<T>(key: string): Promise<T | null> {
  if (onNetlify()) return ((await (await blobs()).get(key, { type: "json" })) as T) ?? null;
  try {
    return JSON.parse(await fs.readFile(fileFor(key), "utf8")) as T;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  if (onNetlify()) {
    await (await blobs()).setJSON(key, value);
    return;
  }
  const f = fileFor(key);
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.writeFile(`${f}.tmp`, JSON.stringify(value, null, 2));
  await fs.rename(`${f}.tmp`, f);
}

/** Claves que empiezan con un prefijo de carpeta, por ejemplo "equipo/". */
export async function kvList(prefix: string): Promise<string[]> {
  if (onNetlify()) {
    const { blobs: list } = await (await blobs()).list({ prefix });
    return list.map((b) => b.key);
  }
  const dir = path.join(DIR(), ...prefix.replace(/\/$/, "").split("/").map((p) => encodeURIComponent(p)));
  try {
    const files = await fs.readdir(dir);
    return files.filter((f) => f.endsWith(".json")).map((f) => `${prefix.replace(/\/?$/, "/")}${decodeURIComponent(f.slice(0, -5))}`);
  } catch {
    return [];
  }
}
