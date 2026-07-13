// ## ==========================================================================
// ## lib/assetPath.ts — Prefijo de assets estáticos para despliegues con
// ## basePath (ej. jbstrategybusiness.com/odds). Un <img src="/logo.png">
// ## plano NO se reescribe solo con basePath (a diferencia de next/image),
// ## así que centralizamos aquí el prefijo. En local (basePath vacío) no
// ## cambia nada. Cero lógica de negocio — solo resolución de rutas.
// ## ==========================================================================
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  return `${BASE_PATH}${path}`;
}
