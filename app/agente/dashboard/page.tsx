"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, MapPin, Users } from "lucide-react"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { NavBar } from "@/components/features/NavBar"
import { stagger, fadeIn } from "@/components/ui/motion"
import { toast } from "sonner"

interface Gestante {
  id: string; nome: string; email: string; cartaoSUS?: string
  endereco?: string; semanaAtual: number; medicoVinculado?: string
}
interface DashData { agente: { nome: string; regiao: string }; totalGestantes: number; gestantes: Gestante[] }

export default function AgenteDashboard() {
  const router = useRouter()
  const user = getUser()
  const [data, setData] = useState<DashData | null>(null)
  const [busca, setBusca] = useState("")
  const [loading, setLoading] = useState(true)

  const load = async (q?: string) => {
    if (!user) return
    try {
      const res = await api.agente.dashboard(user.id, q) as DashData
      setData(res)
    } catch { toast.error("Erro ao carregar") }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!user || user.role !== "AGENTE") { router.push("/"); return }
    load()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-bg">
      <NavBar title="Agente de Saúde" />
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-12 space-y-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-muted text-sm">Área de atuação</p>
          <h1 className="text-xl font-bold text-white">{data?.agente.nome ?? user?.nome}</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-xs text-muted">{data?.agente.regiao ?? "—"}</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-3xl font-bold gradient-text">{data?.totalGestantes ?? 0}</p>
              <p className="text-xs text-muted">gestantes na sua região</p>
            </div>
          </Card>
        </motion.div>

        {/* Search */}
        <div className="flex gap-2">
          <input
            className="field flex-1"
            placeholder="Buscar por nome, Cartão SUS ou endereço..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load(busca)}
          />
          <button onClick={() => load(busca)} className="btn-ghost px-4">
            <Search className="w-4 h-4" />
          </button>
        </div>

        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
          {(data?.gestantes?.length ?? 0) === 0 ? (
            <motion.div variants={fadeIn} className="text-center py-16">
              <Users className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-muted text-sm">Nenhuma gestante encontrada</p>
            </motion.div>
          ) : data!.gestantes.map((g, i) => (
            <motion.div key={g.id} variants={fadeIn} transition={{ delay: i * 0.06 }}>
              <Card glow>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500/20 to-violet-500/20 border border-rose-500/20 flex items-center justify-center text-lg flex-shrink-0">
                      🤰
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{g.nome}</p>
                      <p className="text-xs text-muted">{g.semanaAtual}ª semana</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {g.medicoVinculado ? (
                      <span className="text-xs text-emerald-400">✅ Com médico</span>
                    ) : (
                      <span className="text-xs text-amber-400">⚠️ Sem médico</span>
                    )}
                  </div>
                </div>
                {g.endereco && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-muted" />
                    <p className="text-xs text-muted">{g.endereco}</p>
                  </div>
                )}
                {g.cartaoSUS && (
                  <p className="text-xs text-muted mt-1">SUS: {g.cartaoSUS}</p>
                )}
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
