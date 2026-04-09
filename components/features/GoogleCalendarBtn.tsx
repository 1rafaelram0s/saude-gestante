"use client"

import { CalendarDays, ExternalLink } from "lucide-react"
import { motion } from "framer-motion"

interface Appointment {
  id: string
  data: string
  hora: string
  local: string
  observacoes?: string
  googleCalendarUrl?: string
}

interface GoogleCalendarBtnProps {
  appointment: Appointment
}

export function GoogleCalendarBtn({ appointment }: GoogleCalendarBtnProps) {
  const url = appointment.googleCalendarUrl ?? buildUrl(appointment)

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
    >
      <CalendarDays className="w-3.5 h-3.5" />
      Adicionar ao Google Calendar
      <ExternalLink className="w-3 h-3" />
    </motion.a>
  )
}

function buildUrl(a: Appointment): string {
  const start = new Date(`${a.data}T${a.hora}:00`)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(".000", "")
  return (
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent("Consulta Pré-natal")}` +
    `&dates=${fmt(start)}/${fmt(end)}` +
    `&details=${encodeURIComponent(a.observacoes ?? "Consulta agendada pelo Materna")}` +
    `&location=${encodeURIComponent(a.local)}`
  )
}
