"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, MessageCircle, Search, Copy, Check } from "lucide-react"
import { api } from "@/lib/api"
import { getUser, logout } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { WeekCard } from "@/components/features/WeekCard"
import { ChatPanel } from "@/components/features/ChatPanel"
import { GoogleCalendarBtn } from "@/components/features/GoogleCalendarBtn"
import { Card } from "@/components/ui/card"
import { NavBar } from "@/components/features/NavBar"
import { CARD_COLORS, formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { stagger, fadeIn } from "@/components/ui/motion"

interface DashboardData {
  usuario: { nome: string; email: string; endereco?: string; cartaoSUS?: string; codigoAcompanhante?: string }
  gestacao: { semanaAtual: number; diaAtual: number; progresso: number; icone: string; dum: string }
  proximasConsultas: Array<{ id: string; data: string; hora: string; local: string; observacoes?: string; googleCalendarUrl?: string }>
  cardsInformativos: Array<{ id: string; titulo: string; descricao: string; tipo: string; criadoEm: string }>
  chat: { mensagens: unknown[]; totalNaoLidas: number }
  medicoVinculado?: { id: string; nome: string } | null
}

interface Medico { id: string; nome: string; crm: string; especialidade: string }

type Tab = "home" | "consultas" | "chat" | "perfil"

const fadeInUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

export default function GestanteDashboard() {
  const router = useRouter()
  const user = getUser()
  const [data, setData] = useState<DashboardData | null>(null)
  const [tab, setTab] = useState<Tab>("home")
  const [copied, setCopied] = useState(false)
  const [chatMedicoId, setChatMedicoId] = useState<string | null>(null)
  const [chatMedicoNome, setChatMedicoNome] = useState("")
  const [searchMedico, setSearchMedico] = useState("")
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)
  const [editWeek, setEditWeek] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingWeek, setSavingWeek] = useState(false)

  const loadDashboard = async () => {
    if (!user) return

    try {
      const dashboard = await api.gestante.dashboard(user.id) as DashboardData
      setData(dashboard)
      setEditWeek(String(dashboard.gestacao.semanaAtual))
      if (dashboard.medicoVinculado) {
        setChatMedicoId(dashboard.medicoVinculado.id)
        setChatMedicoNome(dashboard.medicoVinculado.nome)
      }
    } catch {
      toast.error("Erro ao carregar dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user || user.role !== "GESTANTE") { router.push("/"); return }
    void loadDashboard()
  }, [])

  const buscarMedicos = async () => {
    try {
      const res = await api.medico.buscar(searchMedico) as { medicos: Medico[] }
      setMedicos(res.medicos ?? [])
    } catch { toast.error("Erro ao buscar médicos") }
  }

  const solicitarMedico = async (medicoId: string) => {
    if (!user) return
    try {
      await api.medico.solicitar(user.id, medicoId)
      toast.success("Solicitação enviada! Aguarde o médico aceitar. ✅")
    } catch { toast.error("Erro ao enviar solicitação") }
  }

  const copiarCodigo = () => {
    const codigo = data?.usuario?.codigoAcompanhante
    if (!codigo) return
    navigator.clipboard.writeText(codigo)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Código copiado!")
  }

  const salvarSemana = async () => {
    if (!user) return

    const novaSemana = Number.parseInt(editWeek, 10)

    if (!Number.isInteger(novaSemana) || novaSemana < 1 || novaSemana > 42) {
      toast.error("Informe uma semana entre 1 e 42.")
      return
    }

    if (!confirmPassword.trim()) {
      toast.error("Confirme sua senha para salvar.")
      return
    }

    setSavingWeek(true)
    try {
      await api.gestante.atualizarSemana(user.id, novaSemana, confirmPassword)
      setConfirmPassword("")
      await loadDashboard()
      toast.success("Semana atualizada com sucesso.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar semana")
    } finally {
      setSavingWeek(false)
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <NavBar title="Materna" />

      <div className="max-w-2xl mx-auto px-4 pb-28 pt-6">
        <AnimatePresence mode="wait">

          {/* ─── HOME ─── */}
          {tab === "home" && (
            <motion.div key="home" variants={stagger} initial="hidden" animate="show" className="space-y-4">
              {/* Greeting */}
              <motion.div variants={fadeIn}>
                <p className="text-muted text-sm">Bom dia 🌸</p>
                <h1 className="text-xl font-bold text-white mt-0.5">
                  {data?.usuario.nome?.split(" ")[0] ?? user.nome.split(" ")[0]}
                </h1>
              </motion.div>

              {/* Week Card */}
              {data?.gestacao && (
                <motion.div variants={fadeIn}>
                  <WeekCard
                    week={data.gestacao.semanaAtual}
                    day={data.gestacao.diaAtual}
                    progress={data.gestacao.progresso}
                  />
                </motion.div>
              )}

              {/* Cards do médico */}
              {(data?.cardsInformativos?.length ?? 0) > 0 && (
                <motion.div variants={fadeIn}>
                  <p className="text-xs text-muted uppercase tracking-widest mb-3">Do seu médico</p>
                  <div className="space-y-2">
                    {data!.cardsInformativos.slice(0, 3).map((card, i) => {
                      const colors = CARD_COLORS[card.tipo] ?? CARD_COLORS["DICA"]
                      return (
                        <motion.div
                          key={card.id ?? i}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`rounded-xl p-4 border ${colors.bg} ${colors.border}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                            <span className="text-xs text-muted uppercase tracking-wider">{card.tipo}</span>
                          </div>
                          <p className="text-sm font-medium text-white">{card.titulo}</p>
                          <p className="text-xs text-muted mt-1 leading-relaxed">{card.descricao}</p>
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* Código acompanhante */}
              {data?.usuario?.codigoAcompanhante && (
                <motion.div variants={fadeIn}>
                  <Card className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted mb-1">Código para acompanhante</p>
                      <p className="text-lg font-bold text-white tracking-widest font-mono">
                        {data.usuario.codigoAcompanhante}
                      </p>
                    </div>
                    <button onClick={copiarCodigo} className="btn-ghost py-2 px-3 text-xs">
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </Card>
                </motion.div>
              )}

              {/* Buscar médico */}
              <motion.div variants={fadeIn}>
                <p className="text-xs text-muted uppercase tracking-widest mb-3">Vincular médico</p>
                <div className="flex gap-2">
                  <input
                    className="field flex-1"
                    placeholder="Buscar médico por nome ou CRM..."
                    value={searchMedico}
                    onChange={e => setSearchMedico(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && buscarMedicos()}
                  />
                  <button onClick={buscarMedicos} className="btn-ghost px-4">
                    <Search className="w-4 h-4" />
                  </button>
                </div>
                {medicos.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {medicos.map(m => (
                      <Card key={m.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{m.nome}</p>
                          <p className="text-xs text-muted">{m.especialidade} · {m.crm}</p>
                        </div>
                        <button onClick={() => solicitarMedico(m.id)} className="btn-ghost py-1.5 px-3 text-xs">
                          Solicitar
                        </button>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* ─── CONSULTAS ─── */}
          {tab === "consultas" && (
            <motion.div key="consultas" variants={stagger} initial="hidden" animate="show" className="space-y-4">
              <motion.h2 variants={fadeIn} className="text-lg font-bold text-white">Consultas</motion.h2>
              {(data?.proximasConsultas?.length ?? 0) === 0 ? (
                <motion.div variants={fadeIn} className="text-center py-16">
                  <Calendar className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-muted text-sm">Nenhuma consulta agendada</p>
                </motion.div>
              ) : (
                data!.proximasConsultas.map((c, i) => (
                  <motion.div key={c.id ?? i} variants={fadeIn}>
                    <Card glow>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-4 h-4 text-violet-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{formatDate(c.data)}</p>
                            <p className="text-xs text-muted">{c.hora} · {c.local}</p>
                            {c.observacoes && <p className="text-xs text-muted mt-1">{c.observacoes}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border">
                        <GoogleCalendarBtn appointment={c} />
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* ─── CHAT ─── */}
          {tab === "chat" && (
            <motion.div key="chat" variants={stagger} initial="hidden" animate="show" className="space-y-4">
              <motion.h2 variants={fadeIn} className="text-lg font-bold text-white">Chat com médico</motion.h2>
              {chatMedicoId ? (
                <ChatPanel
                  userId={user.id}
                  comId={chatMedicoId}
                  comNome={chatMedicoNome}
                  onClose={() => setChatMedicoId(null)}
                />
              ) : (
                <motion.div variants={fadeIn} className="text-center py-16">
                  <MessageCircle className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-muted text-sm">Selecione seu médico vinculado para iniciar o chat</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ─── PERFIL ─── */}
          {tab === "perfil" && (
            <motion.div key="perfil" variants={stagger} initial="hidden" animate="show" className="space-y-4">
              <motion.h2 variants={fadeIn} className="text-lg font-bold text-white">Meu Perfil</motion.h2>
              <motion.div variants={fadeIn}>
                <Card>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center text-2xl">
                      🤰
                    </div>
                    <div>
                      <p className="font-semibold text-white">{data?.usuario.nome ?? user.nome}</p>
                      <p className="text-xs text-muted">{data?.usuario.email ?? user.email}</p>
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Gestante
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Semana atual", value: `${data?.gestacao.semanaAtual ?? 0}ª semana` },
                      { label: "DUM", value: data?.gestacao.dum ? formatDate(data.gestacao.dum) : "—" },
                      { label: "Cartão SUS", value: data?.usuario.cartaoSUS ?? "—" },
                      { label: "Endereço", value: data?.usuario.endereco ?? "—" },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                        <span className="text-xs text-muted">{item.label}</span>
                        <span className="text-sm text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
              <motion.div variants={fadeIn}>
                <Card>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Editar semana</h3>
                      <p className="text-xs text-muted mt-1">
                        A alteração exige confirmação com a sua senha.
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                      Semana {data?.gestacao.semanaAtual ?? "—"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted block mb-1.5">Nova semana gestacional</label>
                      <input
                        type="number"
                        min={1}
                        max={42}
                        value={editWeek}
                        onChange={e => setEditWeek(e.target.value)}
                        className="field"
                        placeholder="Ex: 20"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted block mb-1.5">Confirmar com a senha</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="field"
                        placeholder="Sua senha atual"
                      />
                    </div>
                    <button
                      onClick={salvarSemana}
                      disabled={savingWeek}
                      className="btn-primary"
                    >
                      {savingWeek ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        "Salvar semana"
                      )}
                    </button>
                  </div>
                </Card>
              </motion.div>
              <motion.button variants={fadeIn} onClick={logout} className="btn-ghost w-full text-sm text-red-400 border-red-500/20 hover:bg-red-500/5">
                Sair da conta
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-around">
          {([
            { id: "home", icon: "🏠", label: "Início" },
            { id: "consultas", icon: "📅", label: "Consultas" },
            { id: "chat", icon: "💬", label: "Chat", badge: data?.chat.totalNaoLidas },
            { id: "perfil", icon: "👤", label: "Perfil" },
          ] as const).map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="flex flex-col items-center gap-1 relative"
            >
              <span className="text-lg">{item.icon}</span>
              <span className={`text-[10px] font-medium transition-colors ${tab === item.id ? "text-rose-400" : "text-muted"}`}>
                {item.label}
              </span>
              {item.badge ? (
                <span className="absolute -top-1 -right-2 w-4 h-4 bg-rose-500 rounded-full text-[9px] text-white flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
              {tab === item.id && (
                <motion.div layoutId="tab-indicator" className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 bg-rose-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
