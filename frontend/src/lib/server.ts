import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4200/api";

/**
 * Appel au backend côté serveur en transmettant le cookie de session JWT.
 * Retourne null si l'utilisateur n'est pas authentifié ou en cas d'erreur.
 */
export async function apiServer<T = unknown>(path: string): Promise<T | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("its_token")?.value;
    if (!token) return null;

    const res = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      headers: { cookie: `its_token=${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
