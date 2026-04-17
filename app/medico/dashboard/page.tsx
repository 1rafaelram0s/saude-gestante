"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Users, CalendarDays, Bell, Plus, Check, X, Search } from "lucide-react"
import { api } from "@/lib/api"
import { getUser, logout } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { NavBar } from "@/components/features/NavBar"
import { ChatPanel } from "@/components/features/ChatPanel"
import { GoogleCalendarBtn } from "@/components/features/GoogleCalendarBtn"
import { stagger, fadeIn } from "@/components/ui/motion"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"

interface Gestante { id: string; nome: string; email: string; cartaoSUS?: string; semanaAtual: number; dum?: string }
interface Solicitacao { id: string; gestanteId: string; status: string }
interface DashboardData {
  medico: { nome: string; crm: string; especialidade: string }
  resumo: { totalGestantes: number; consultasHoje: number; alertasPendentes: number }
  gestantes: Gestante[]
  solicitacoesPendentes: Solicitacao[]
}

type Tab = "gestantes" | "solicitacoes" | "consultas" | "cards"

export default function MedicoDashboard() {
  const router = useRouter()
  const user = getUser()
  const [data, setData] = useState<DashboardData | null>(null)
  const [tab, setTab] = useState<Tab>("gestantes")
  const [chatGestante, setChatGestante] = useState<Gestante | null>(null)
  const [loading, setLoading] = useState(true)

  // Agendamento
  const [agendForm, setAgendForm] = useState({ gestanteId: "", data: "", hora: "", local: "", observacoes: "" })
  const [agendResult, setAgendResult] = useState<{ googleCalendarUrl?: string } | null>(null)
  const [agendSearch, setAgendSearch] = useState("")

  // Card form
  const [cardForm, setCardForm] = useState({ gestanteId: "", titulo: "", descricao: "", tipo: "DICA" })
  const [cardSearch, setCardSearch] = useState("")

  const loadDashboard = async (withSpinner = false) => {
    if (!user) return

    if (withSpinner) setLoading(true)

    try {
      const res = await api.medico.dashboard(user.id) as DashboardData
      setData(res)
    } catch {
      toast.error("Erro ao carregar dashboard")
    } finally {
      if (withSpinner) setLoading(false)
    }
  }

  useEffect(() => {
    if (!user || user.role !== "MEDICO") { router.push("/"); return }
    void loadDashboard(true)
  }, [])

  const responderSolicita = async (id: string, acao: "ACEITAR" | "RECUSAR") => {
    try {
      await api.medico.responderSolicitacao(id, acao)
      toast.success(acao === "ACEITAR" ? "Gestante aceita! ✅" : "Solicitação recusada")
      await loadDashboard()
    } catch { toast.error("Erro ao responder") }
  }

  const agendar = async () => {
    if (!agendForm.gestanteId) {
      toast.error("Busque e selecione uma gestante antes de agendar.")
      return
    }

    try {
      const res = await api.consultas.agendar({ ...agendForm, medicoId: user?.id }) as { consulta: { googleCalendarUrl?: string } }
      setAgendResult(res.consulta)
      toast.success("Consulta agendada! 📅")
    } catch { toast.error("Erro ao agendar consulta") }
  }

  const criarCard = async () => {
    if (!cardForm.gestanteId) {
      toast.error("Busque e selecione uma gestante antes de criar o card.")
      return
    }

    try {
      await api.cards.criar({ ...cardForm, medicoId: user?.id })
      toast.success("Card criado! ✅")
      setCardForm({ gestanteId: "", titulo: "", descricao: "", tipo: "DICA" })
      setCardSearch("")
    } catch { toast.error("Erro ao criar card") }
  }

  const normalize = (value: string) =>
    value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

  const filterGestantes = (value: string) => {
    const query = normalize(value)

    if (!query) return []

    return (data?.gestantes ?? [])
      .filter(gestante =>
        normalize(gestante.cartaoSUS ?? "").includes(query),
      )
      .slice(0, 5)
  }

  const gestanteAgendada = data?.gestantes.find(g => g.id === agendForm.gestanteId) ?? null
  const gestanteCard = data?.gestantes.find(g => g.id === cardForm.gestanteId) ?? null
  const agendResults = filterGestantes(agendSearch)
  const cardResults = filterGestantes(cardSearch)

  if (!user || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  )

  const STAT = [
    { label: "Gestantes", value: data?.resumo.totalGestantes ?? 0, icon: "🤰", color: "from-rose-500 to-rose-600" },
    { label: "Consultas hoje", value: data?.resumo.consultasHoje ?? 0, icon: "📅", color: "from-violet-500 to-violet-600" },
    { label: "Solicitações", value: data?.resumo.alertasPendentes ?? 0, icon: "🔔", color: "from-amber-500 to-orange-500" },
  ]

  return (
    <div className="min-h-screen bg-bg">
      <NavBar title="Painel Médico" />

      <div className="max-w-2xl mx-auto px-4 pb-28 pt-6 space-y-5">
        {/* Greeting + stats */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-muted text-sm">Bem-vindo(a)</p>
          <h1 className="text-xl font-bold text-white">{data?.medico.nome ?? user.nome}</h1>
          <p className="text-xs text-muted mt-0.5">{data?.medico.especialidade} · {data?.medico.crm}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3">
          {STAT.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="text-center py-4">
                <span className="text-2xl">{s.icon}</span>
                <p className={`text-2xl font-bold mt-1 bg-gradient-to-br ${s.color} bg-clip-text text-transparent`}>{s.value}</p>
                <p className="text-[11px] text-muted mt-0.5">{s.label}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Tab nav */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            { id: "gestantes", label: "Gestantes" },
            { id: "solicitacoes", label: "Solicitações" },
            { id: "consultas", label: "Agendar" },
            { id: "cards", label: "Cards" },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                tab === t.id
                  ? "bg-gradient-to-r from-rose-500/20 to-violet-500/20 border border-rose-500/30 text-white"
                  : "text-muted border border-border hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Gestantes */}
          {tab === "gestantes" && (
            <motion.div key="gestantes" variants={stagger} initial="hidden" animate="show" className="space-y-3">
              {(data?.gestantes?.length ?? 0) === 0 ? (
                <motion.div variants={fadeIn} className="text-center py-16">
                  <Users className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-muted text-sm">Nenhuma gestante vinculada</p>
                </motion.div>
              ) : data!.gestantes.map((g, i) => (
                <motion.div key={g.id} variants={fadeIn}>
                  <Card glow className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500/20 to-violet-500/20 border border-rose-500/20 flex items-center justify-center text-lg">
                        🤰
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{g.nome}</p>
                        <p className="text-xs text-muted">{g.semanaAtual}ª semana de gestação</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setChatGestante(g)}
                      className="btn-ghost py-1.5 px-3 text-xs"
                    >
                      Chat
                    </button>
                  </Card>
                </motion.div>
              ))}
              {chatGestante && (
                <ChatPanel
                  userId={user.id}
                  comId={chatGestante.id}
                  comNome={chatGestante.nome}
                  onClose={() => setChatGestante(null)}
                />
              )}
            </motion.div>
          )}

          {/* Solicitações */}
          {tab === "solicitacoes" && (
            <motion.div key="solicitacoes" variants={stagger} initial="hidden" animate="show" className="space-y-3">
              {(data?.solicitacoesPendentes?.length ?? 0) === 0 ? (
                <motion.div variants={fadeIn} className="text-center py-16">
                  <Bell className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-muted text-sm">Nenhuma solicitação pendente</p>
                </motion.div>
              ) : data!.solicitacoesPendentes.map(s => (
                <motion.div key={s.id} variants={fadeIn}>
                  <Card className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">Gestante ID: {s.gestanteId}</p>
                      <span className="text-xs text-amber-400">⏳ Pendente</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => responderSolicita(s.id, "ACEITAR")}
                        className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => responderSolicita(s.id, "RECUSAR")}
                        className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Agendar consulta */}
          {tab === "consultas" && (
            <motion.div key="consultas" variants={stagger} initial="hidden" animate="show" className="space-y-3">
              <motion.h3 variants={fadeIn} className="text-sm font-semibold text-white">Agendar consulta</motion.h3>
              <motion.div variants={fadeIn} className="space-y-3">
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      className="field pl-10"
                      placeholder="Buscar gestante pelo Cartão SUS..."
                      value={agendSearch}
                      onChange={e => {
                        setAgendSearch(e.target.value)
                        setAgendForm(p => ({ ...p, gestanteId: "" }))
                      }}
                    />
                    <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {gestanteAgendada && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                      <p className="text-sm text-white">{gestanteAgendada.nome}</p>
                      <p className="text-xs text-muted">SUS: {gestanteAgendada.cartaoSUS || "Não informado"}</p>
                    </div>
                  )}
                  {!gestanteAgendada && agendSearch.trim() && (
                    <div className="space-y-2">
                      {agendResults.length > 0 ? agendResults.map(gestante => (
                        <button
                          key={gestante.id}
                          type="button"
                          onClick={() => {
                            setAgendForm(p => ({ ...p, gestanteId: gestante.id }))
                            setAgendSearch(gestante.nome)
                          }}
                          className="w-full text-left rounded-xl border border-border px-3 py-2 hover:border-rose-500/30 transition-colors"
                        >
                          <p className="text-sm text-white">{gestante.nome}</p>
                          <p className="text-xs text-muted">SUS: {gestante.cartaoSUS || "Não informado"}</p>
                        </button>
                      )) : (
                        <p className="text-xs text-muted">Nenhuma gestante encontrada.</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted block mb-1.5">Data</label>
                    <input type="date" className="field" value={agendForm.data} onChange={e => setAgendForm(p => ({ ...p, data: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted block mb-1.5">Hora</label>
                    <input type="time" className="field" value={agendForm.hora} onChange={e => setAgendForm(p => ({ ...p, hora: e.target.value }))} />
                  </div>
                </div>
                <input className="field" placeholder="Local / Endereço" value={agendForm.local} onChange={e => setAgendForm(p => ({ ...p, local: e.target.value }))} />
                <textarea className="field" placeholder="Observações (opcional)" rows={3} value={agendForm.observacoes} onChange={e => setAgendForm(p => ({ ...p, observacoes: e.target.value }))} />
                <button onClick={agendar} className="btn-primary">
                  <CalendarDays className="w-4 h-4" /> Agendar Consulta
                </button>
                {agendResult?.googleCalendarUrl && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4">
                    <p className="text-xs text-muted mb-2">Consulta agendada! Sincronize com o calendário:</p>
                    <GoogleCalendarBtn appointment={{ id: "", data: agendForm.data, hora: agendForm.hora, local: agendForm.local, googleCalendarUrl: agendResult.googleCalendarUrl }} />
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* Cards */}
          {tab === "cards" && (
            <motion.div key="cards" variants={stagger} initial="hidden" animate="show" className="space-y-3">
              <motion.h3 variants={fadeIn} className="text-sm font-semibold text-white">Criar card informativo</motion.h3>
              <motion.div variants={fadeIn} className="space-y-3">
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      className="field pl-10"
                      placeholder="Buscar gestante pelo Cartão SUS..."
                      value={cardSearch}
                      onChange={e => {
                        setCardSearch(e.target.value)
                        setCardForm(p => ({ ...p, gestanteId: "" }))
                      }}
                    />
                    <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {gestanteCard && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                      <p className="text-sm text-white">{gestanteCard.nome}</p>
                      <p className="text-xs text-muted">SUS: {gestanteCard.cartaoSUS || "Não informado"}</p>
                    </div>
                  )}
                  {!gestanteCard && cardSearch.trim() && (
                    <div className="space-y-2">
                      {cardResults.length > 0 ? cardResults.map(gestante => (
                        <button
                          key={gestante.id}
                          type="button"
                          onClick={() => {
                            setCardForm(p => ({ ...p, gestanteId: gestante.id }))
                            setCardSearch(gestante.nome)
                          }}
                          className="w-full text-left rounded-xl border border-border px-3 py-2 hover:border-rose-500/30 transition-colors"
                        >
                          <p className="text-sm text-white">{gestante.nome}</p>
                          <p className="text-xs text-muted">SUS: {gestante.cartaoSUS || "Não informado"}</p>
                        </button>
                      )) : (
                        <p className="text-xs text-muted">Nenhuma gestante encontrada.</p>
                      )}
                    </div>
                  )}
                </div>
                <select className="field" value={cardForm.tipo} onChange={e => setCardForm(p => ({ ...p, tipo: e.target.value }))}>
                  <option value="DICA">💡 Dica</option>
                  <option value="ALERTA">🚨 Alerta</option>
                  <option value="ORIENTAÇÃO">📋 Orientação</option>
                </select>
                <input className="field" placeholder="Título" value={cardForm.titulo} onChange={e => setCardForm(p => ({ ...p, titulo: e.target.value }))} />
                <textarea className="field" placeholder="Descrição detalhada..." rows={4} value={cardForm.descricao} onChange={e => setCardForm(p => ({ ...p, descricao: e.target.value }))} />
                <button onClick={criarCard} className="btn-primary">
                  <Plus className="w-4 h-4" /> Criar Card
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
