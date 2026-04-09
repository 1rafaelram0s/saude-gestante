"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, MessageCircle, X } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface Msg {
  id?: string
  remetenteId: string
  destinatarioId: string
  mensagem: string
  timestamp: string
}

interface ChatPanelProps {
  userId: string
  comId: string
  comNome: string
  onClose?: () => void
}

export function ChatPanel({ userId, comId, comNome, onClose }: ChatPanelProps) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    try {
      const res = await api.chat.mensagens(userId, comId) as { mensagens: Msg[] }
      setMsgs(res.mensagens ?? [])
    } catch {}
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 5000) // polling a cada 5s
    return () => clearInterval(id)
  }, [userId, comId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [msgs])

  const send = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const temp: Msg = {
      remetenteId: userId,
      destinatarioId: comId,
      mensagem: input,
      timestamp: new Date().toISOString(),
    }
    setMsgs(prev => [...prev, temp])
    setInput("")
    try {
      await api.chat.enviar(userId, comId, temp.mensagem)
    } catch {
      toast.error("Falha ao enviar mensagem")
    } finally {
      setSending(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex flex-col h-[420px] rounded-2xl bg-bg-card border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <MessageCircle className="w-4 h-4 text-rose-400" />
          <span className="text-sm font-medium text-white">{comNome}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence initial={false}>
          {msgs.map((m, i) => {
            const isMe = m.remetenteId === userId
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    isMe
                      ? "bg-gradient-to-br from-rose-500 to-violet-600 text-white rounded-br-sm"
                      : "bg-bg-elevated border border-border text-white rounded-bl-sm"
                  }`}
                >
                  {m.mensagem}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            className="flex-1 field py-2 text-sm"
            placeholder="Digite uma mensagem..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center disabled:opacity-40 transition-opacity"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
