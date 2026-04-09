"use client"

import { motion } from "framer-motion"
import { getBabyInfo } from "@/lib/utils"
import { Card } from "@/components/ui/card"

interface WeekCardProps {
  week: number
  day: number
  progress: number
}

export function WeekCard({ week, day, progress }: WeekCardProps) {
  const { size, icon } = getBabyInfo(week)
  const trimestre = week <= 13 ? "1º Trimestre" : week <= 26 ? "2º Trimestre" : "3º Trimestre"

  return (
    <Card className="relative overflow-hidden border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-violet-600/5">
      {/* Glow orb */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs text-muted uppercase tracking-widest mb-1">{trimestre}</p>
            <div className="flex items-end gap-2">
              <motion.span
                className="text-6xl font-bold gradient-text leading-none"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              >
                {week}
              </motion.span>
              <span className="text-muted text-sm pb-1">semanas</span>
            </div>
            {day > 0 && (
              <p className="text-xs text-muted mt-1">e {day} dia{day > 1 ? "s" : ""}</p>
            )}
          </div>

          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="text-5xl select-none"
          >
            {icon}
          </motion.div>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted mb-2">
            <span>Semana 1</span>
            <span className="text-white">{progress}%</span>
            <span>42 semanas</span>
          </div>
          <div className="progress-track h-2">
            <motion.div
              className="progress-fill h-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
            />
          </div>
        </div>

        <p className="text-xs text-muted">
          Seu bebê tem o tamanho de uma{" "}
          <span className="text-white font-medium">{size}</span>
        </p>
      </div>
    </Card>
  )
}
