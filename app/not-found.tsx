"use client"

import { motion } from "framer-motion"
import { Heart, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="text-7xl mb-6"
        >
          🍋
        </motion.div>
        <h1 className="text-3xl font-bold text-white mb-2">Página não encontrada</h1>
        <p className="text-muted text-sm mb-8">Parece que você se perdeu no caminho… como a gente às vezes na gravidez! 💕</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 btn-ghost"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>
      </motion.div>
    </div>
  )
}
