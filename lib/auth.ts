import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

export interface AuthUser {
  id: string
  nome: string
  email: string
  role: "GESTANTE" | "MEDICO" | "AGENTE" | "ACOMPANHANTE"
  token: string
  codigoAcompanhante?: string
}

const KEY = "saude_gestante_user"

export function saveUser(user: AuthUser) {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(user))
  }
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY)
    if (auth) {
      void signOut(auth).catch(() => undefined)
    }
    window.location.href = "/"
  }
}

export function getRolePath(role: string): string {
  const map: Record<string, string> = {
    GESTANTE: "/gestante/dashboard",
    MEDICO: "/medico/dashboard",
    AGENTE: "/agente/dashboard",
    ACOMPANHANTE: "/acompanhante/dashboard",
  }
  return map[role] ?? "/"
}
