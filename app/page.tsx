"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Heart, Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react"
import { api } from "@/lib/api"
import { saveUser, getRolePath, getUser, type AuthUser } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Mínimo 6 caracteres"),
})
type LoginForm = z.infer<typeof loginSchema>

export default function HomePage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const u = getUser()
    if (u) router.push(getRolePath(u.role))
  }, [router])

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const res = await api.auth.login(data.email, data.senha) as {
        success: boolean; user: { id: string; nome: string; email: string; role: string; token: string; codigoAcompanhante?: string }; error?: string
      }
      if (!res.success) throw new Error(res.error ?? "Credenciais inválidas")
      saveUser({
        id: res.user.id,
        nome: res.user.nome,
        email: res.user.email,
        role: res.user.role as AuthUser["role"],
        token: res.user.token,
        codigoAcompanhante: res.user.codigoAcompanhante,
      })
      toast.success(`Bem-vinda, ${res.user.nome.split(" ")[0]}! 💕`)
      router.push(getRolePath(res.user.role))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao fazer login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(244,63,94,0.3)]"
          >
            <Heart className="w-7 h-7 text-white" fill="white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white">Materna</h1>
          <p className="text-sm text-muted mt-1">Sua jornada começa aqui</p>
        </div>

        {/* Login Card */}
        <div className="glass rounded-2xl p-6 border border-border">
          <h2 className="text-base font-semibold text-white mb-5">Entrar na conta</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <input
                {...register("email")}
                type="email"
                placeholder="seu@email.com"
                className="field"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="relative">
              <input
                {...register("senha")}
                type={showPass ? "text" : "password"}
                placeholder="Senha"
                className="field pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {errors.senha && (
                <p className="text-xs text-red-400 mt-1">{errors.senha.message}</p>
              )}
            </div>

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
                  Entrar <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>
        </div>

        {/* Cadastro link */}
        <div className="mt-4 text-center">
          <span className="text-sm text-muted">Não tem conta? </span>
          <motion.a
            href="/cadastro"
            className="text-sm text-rose-400 hover:text-rose-300 font-medium transition-colors inline-flex items-center gap-1"
            whileHover={{ x: 2 }}
          >
            Criar agora <Sparkles className="w-3.5 h-3.5" />
          </motion.a>
        </div>
      </motion.div>
    </div>
  )
}
