import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calcWeek(dum: string): { week: number; day: number; progress: number } {
  const dumDate = new Date(dum)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - dumDate.getTime()) / 86400000)
  const week = Math.min(Math.floor(diffDays / 7), 42)
  const day = diffDays % 7
  return { week, day, progress: Math.round((week / 42) * 100) }
}

export function getBabyInfo(week: number): { size: string; icon: string } {
  const data: Record<number, { size: string; icon: string }> = {
    4: { size: "semente de papoula", icon: "🌱" },
    8: { size: "framboesa (1,6cm)", icon: "🫐" },
    12: { size: "limão (5,4cm)", icon: "🍋" },
    16: { size: "abacate (11,6cm)", icon: "🥑" },
    20: { size: "banana (25,6cm)", icon: "🍌" },
    24: { size: "milho (30cm)", icon: "🌽" },
    28: { size: "berinjela (37,6cm)", icon: "🍆" },
    32: { size: "abóbora (42,4cm)", icon: "🎃" },
    36: { size: "melão (47,4cm)", icon: "🍈" },
    40: { size: "melancia (51cm)", icon: "🍉" },
  }
  let info = { size: "menor que uma semente", icon: "🫘" }
  for (const k of Object.keys(data).map(Number).sort((a, b) => a - b)) {
    if (week >= k) info = data[k]
  }
  return info
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso))
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
}

export const CARD_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  ALERTA: { bg: "bg-red-500/10", border: "border-red-500/20", dot: "bg-red-500" },
  DICA: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-500" },
  ORIENTAÇÃO: { bg: "bg-violet-500/10", border: "border-violet-500/20", dot: "bg-violet-500" },
}
