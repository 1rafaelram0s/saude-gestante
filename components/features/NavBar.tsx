"use client"

import { logout, getUser } from "@/lib/auth"
import { LogOut, Heart } from "lucide-react"
import { motion } from "framer-motion"

interface NavBarProps {
  title?: string
}

export function NavBar({ title }: NavBarProps) {
  const user = getUser()

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 glass border-b border-border"
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center">
            <Heart className="w-3.5 h-3.5 text-white" fill="white" />
          </div>
          <span className="font-semibold text-sm text-white">
            {title ?? "Materna"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden sm:block text-xs text-muted">
              Olá, {user.nome.split(" ")[0]}
            </span>
          )}
          <button
            onClick={logout}
            className="btn-ghost py-1.5 px-3 text-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </div>
    </motion.header>
  )
}
