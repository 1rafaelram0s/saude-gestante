"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, ArrowRight, Heart, Check } from "lucide-react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const ROLES = [
  { id: "GESTANTE", label: "Gestante", emoji: "🤰", desc: "Acompanhe sua gravidez semana a semana" },
  { id: "MEDICO", label: "Médico(a)", emoji: "👩‍⚕️", desc: "Gerencie suas pacientes gestantes" },
  { id: "AGENTE", label: "Agente de Saúde", emoji: "🏥", desc: "Acompanhe gestantes da sua região" },
  { id: "ACOMPANHANTE", label: "Acompanhante", emoji: "👨‍👩‍👧", desc: "Participe da jornada de alguém especial" },
]

const baseSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Mínimo 6 caracteres"),
  role: z.string().min(1, "Selecione um perfil"),
})

const gestanteSchema = baseSchema.extend({
  dum: z.string().min(1, "Data da última menstruação obrigatória"),
  endereco: z.string().min(5, "Endereço obrigatório"),
  idade: z.string().min(1, "Idade obrigatória"),
  cartaoSUS: z.string().optional(),
})

const medicoSchema = baseSchema.extend({
  crm: z.string().min(1, "CRM obrigatório"),
  especialidade: z.string().min(1, "Especialidade obrigatória"),
})

const agenteSchema = baseSchema.extend({
  nomeRegistro: z.string().min(1, "Nº de registro obrigatório"),
  regiao: z.string().min(1, "Região obrigatória"),
})

const acompSchema = baseSchema.extend({
  grauParentesco: z.string().min(1, "Grau de parentesco obrigatório"),
})

type FormData = z.infer<typeof gestanteSchema> & z.infer<typeof medicoSchema> & z.infer<typeof agenteSchema> & z.infer<typeof acompSchema>

export default function CadastroPage() {
  const router = useRouter()
  const [step, setStep] = useState<"role" | "form">("role")
  const [selectedRole, setSelectedRole] = useState("")
  const [loading, setLoading] = useState(false)

  const schema = selectedRole === "GESTANTE" ? gestanteSchema
    : selectedRole === "MEDICO" ? medicoSchema
    : selectedRole === "AGENTE" ? agenteSchema
    : acompSchema

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await api.auth.cadastro({ ...data, role: selectedRole }) as { success: boolean; error?: string; token?: string }
      if (!res.success) throw new Error(res.error)
      toast.success("Cadastro realizado! Faça login para continuar. 🎉")
      router.push("/")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro no cadastro")
    } finally {
      setLoading(false)
    }
  }

  const selectRole = (id: string) => {
    setSelectedRole(id)
    setValue("role", id)
    setStep("form")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden py-12">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-rose-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => step === "form" ? setStep("role") : router.push("/")}
            className="btn-ghost py-1.5 px-3 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center">
              <Heart className="w-3 h-3 text-white" fill="white" />
            </div>
            <span className="text-sm font-semibold text-white">Criar conta</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === "role" ? (
            <motion.div
              key="role"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-lg font-semibold text-white mb-1">Qual é o seu perfil?</h2>
              <p className="text-sm text-muted mb-6">Escolha como você vai usar o Materna</p>
              <div className="space-y-3">
                {ROLES.map((role, i) => (
                  <motion.button
                    key={role.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => selectRole(role.id)}
                    className="w-full glass rounded-xl p-4 text-left border border-border hover:border-rose-500/30 hover:bg-rose-500/5 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{role.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{role.label}</p>
                        <p className="text-xs text-muted mt-0.5">{role.desc}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted group-hover:text-white transition-colors" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-lg font-semibold text-white mb-1">
                {ROLES.find(r => r.id === selectedRole)?.emoji} Dados cadastrais
              </h2>
              <p className="text-sm text-muted mb-6">Preencha suas informações</p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <input {...register("nome")} placeholder="Nome completo" className="field" />
                {errors.nome && <p className="text-xs text-red-400">{errors.nome.message}</p>}

                <input {...register("email")} type="email" placeholder="Email" className="field" />
                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}

                <input {...register("senha")} type="password" placeholder="Senha (mín. 6 caracteres)" className="field" />
                {errors.senha && <p className="text-xs text-red-400">{errors.senha.message}</p>}

                {/* Campos por role */}
                {selectedRole === "GESTANTE" && (
                  <>
                    <div>
                      <label className="text-xs text-muted block mb-1.5 ml-0.5">Data da Última Menstruação (DUM)</label>
                      <input {...register("dum")} type="date" className="field" />
                      {errors.dum && <p className="text-xs text-red-400 mt-1">{errors.dum.message}</p>}
                    </div>
                    <input {...register("endereco")} placeholder="Endereço completo" className="field" />
                    {errors.endereco && <p className="text-xs text-red-400">{errors.endereco.message}</p>}
                    <input {...register("idade")} type="number" placeholder="Idade" className="field" />
                    <input {...register("cartaoSUS")} placeholder="Número do Cartão SUS (opcional)" className="field" />
                  </>
                )}

                {selectedRole === "MEDICO" && (
                  <>
                    <input {...register("crm")} placeholder="CRM (ex: CRM/SP 123456)" className="field" />
                    {errors.crm && <p className="text-xs text-red-400">{errors.crm.message}</p>}
                    <input {...register("especialidade")} placeholder="Especialidade (ex: Obstetrícia)" className="field" />
                    {errors.especialidade && <p className="text-xs text-red-400">{errors.especialidade.message}</p>}
                  </>
                )}

                {selectedRole === "AGENTE" && (
                  <>
                    <input {...register("nomeRegistro")} placeholder="Nº de Registro" className="field" />
                    {errors.nomeRegistro && <p className="text-xs text-red-400">{errors.nomeRegistro.message}</p>}
                    <input {...register("regiao")} placeholder="Área/Região de atuação" className="field" />
                    {errors.regiao && <p className="text-xs text-red-400">{errors.regiao.message}</p>}
                  </>
                )}

                {selectedRole === "ACOMPANHANTE" && (
                  <>
                    <select {...register("grauParentesco")} className="field">
                      <option value="">Grau de parentesco</option>
                      <option value="Parceiro(a)">Parceiro(a)</option>
                      <option value="Mãe">Mãe</option>
                      <option value="Pai">Pai</option>
                      <option value="Irmã(o)">Irmã(o)</option>
                      <option value="Amigo(a)">Amigo(a)</option>
                      <option value="Outro">Outro</option>
                    </select>
                    {errors.grauParentesco && <p className="text-xs text-red-400">{errors.grauParentesco.message}</p>}
                  </>
                )}

                <motion.button
                  type="submit"
                  className="btn-primary mt-2"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Criar conta
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-sm text-muted mt-6">
          Já tem conta?{" "}
          <a href="/" className="text-rose-400 hover:text-rose-300 font-medium transition-colors">
            Entrar
          </a>
        </p>
      </div>
    </div>
  )
}
