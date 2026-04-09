"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Link2, ArrowRight } from "lucide-react"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { NavBar } from "@/components/features/NavBar"
import { Card } from "@/components/ui/card"
import { WeekCard } from "@/components/features/WeekCard"
import { GoogleCalendarBtn } from "@/components/features/GoogleCalendarBtn"
import { stagger, fadeIn } from "@/components/ui/motion"
import { CARD_COLORS, formatDate } from "@/lib/utils"
import { toast } from "sonner"

interface AcompData { acompanhante: { nome: string; grauParentesco: string }; gestanteId?: string; vinculoAtivo: boolean }

export default function AcompanhanteDashboard() {
  const router = useRouter()
  const user = getUser()
  const [data, setData] = useState<AcompData | null>(null)
  const [gestanteDash, setGestanteDash] = useState<Record<string, unknown> | null>(null)
  const [codigo, setCodigo] = useState("")
  const [vinculando, setVinculando] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || user.role !== "ACOMPANHANTE") { router.push("/"); return }
    api.acompanhante.dashboard(user.id).then(async res => {
      const d = res as AcompData
      setData(d)
      if (d.gestanteId) {
        const gdash = await api.gestante.dashboard(d.gestanteId).catch(() => null)
        if (gdash) setGestanteDash(gdash as Record<string, unknown>)
      }
    }).finally(() => setLoading(false))
  }, [])

  const vincular = async () => {
    if (!codigo.trim() || !user) return
    setVinculando(true)
    try {
      await api.acompanhante.vincular(user.id, codigo)
      toast.success("Vinculado com sucesso! 🎉")
      window.location.reload()
    } catch { toast.error("Código inválido") }
    finally { setVinculando(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
    </div>
  )

  const g = gestanteDash as {
    usuario?: { nome: string }
    gestacao?: { semanaAtual: number; diaAtual: number; progresso: number }
    proximasConsultas?: Array<{ id: string; data: string; hora: string; local: string; googleCalendarUrl?: string }>
    cardsInformativos?: Array<{ id: string; titulo: string; descricao: string; tipo: string }>
  } | null

  return (
    <div className="min-h-screen bg-bg">
      <NavBar title="Acompanhante" />
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-12 space-y-5">

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-muted text-sm">{data?.acompanhante.grauParentesco}</p>
          <h1 className="text-xl font-bold text-white">{data?.acompanhante.nome ?? user?.nome}</h1>
        </motion.div>

        {/* Não vinculado */}
        {!data?.vinculoAtivo || !data.gestanteId ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card className="border-dashed border-rose-500/20 text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
                <Link2 className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">Nenhuma gestante vinculada</h3>
              <p className="text-xs text-muted mb-5">Peça o código para a gestante e insira abaixo</p>
              <div className="flex gap-2 max-w-xs mx-auto">
                <input
                  className="field flex-1 text-center uppercase font-mono tracking-widest"
                  placeholder="ABC123"
                  maxLength={6}
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.toUpperCase())}
                />
                <button onClick={vincular} disabled={vinculando} className="btn-primary w-auto px-4">
                  {vinculando
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </Card>
          </motion.div>
        ) : (
          /* Dashboard espelho da gestante */
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
            <motion.div variants={fadeIn} className="rounded-xl bg-rose-500/5 border border-rose-500/20 px-4 py-2">
              <p className="text-xs text-rose-400">👀 Visualização somente leitura da gestante</p>
            </motion.div>

            {g?.gestacao && (
              <motion.div variants={fadeIn}>
                <WeekCard
                  week={g.gestacao.semanaAtual}
                  day={g.gestacao.diaAtual}
                  progress={g.gestacao.progresso}
                />
              </motion.div>
            )}

            {(g?.cardsInformativos?.length ?? 0) > 0 && (
              <motion.div variants={fadeIn}>
                <p className="text-xs text-muted uppercase tracking-widest mb-3">Orientações do médico</p>
                <div className="space-y-2">
                  {g!.cardsInformativos!.map((card, i) => {
                    const colors = CARD_COLORS[card.tipo] ?? CARD_COLORS["DICA"]
                    return (
                      <motion.div key={card.id ?? i} variants={fadeIn}
                        className={`rounded-xl p-4 border ${colors.bg} ${colors.border}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                          <span className="text-xs text-muted uppercase">{card.tipo}</span>
                        </div>
                        <p className="text-sm font-medium text-white">{card.titulo}</p>
                        <p className="text-xs text-muted mt-1">{card.descricao}</p>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {(g?.proximasConsultas?.length ?? 0) > 0 && (
              <motion.div variants={fadeIn}>
                <p className="text-xs text-muted uppercase tracking-widest mb-3">Próximas consultas</p>
                {g!.proximasConsultas!.map((c, i) => (
                  <Card key={c.id ?? i} glow className="mb-2">
                    <p className="text-sm font-semibold text-white">{formatDate(c.data)}</p>
                    <p className="text-xs text-muted">{c.hora} · {c.local}</p>
                    <div className="mt-3 pt-3 border-t border-border">
                      <GoogleCalendarBtn appointment={c} />
                    </div>
                  </Card>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
