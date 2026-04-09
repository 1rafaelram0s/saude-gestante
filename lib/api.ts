const BASE = "https://rafaelram0s.app.n8n.cloud/webhook"

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Auth
export const api = {
  auth: {
    cadastro: (data: Record<string, unknown>) =>
      req("/cadastro", { method: "POST", body: JSON.stringify(data) }),
    login: (email: string, senha: string) =>
      req("/login", { method: "POST", body: JSON.stringify({ email, senha }) }),
  },
  gestante: {
    dashboard: (userId: string) => req(`/gestante/dashboard?userId=${userId}`),
    semana: (userId: string) => req(`/gestante/semana?userId=${userId}`),
  },
  medico: {
    dashboard: (userId: string) => req(`/medico/dashboard?userId=${userId}`),
    buscar: (busca?: string, especialidade?: string) => {
      const params = new URLSearchParams()
      if (busca) params.set("busca", busca)
      if (especialidade) params.set("especialidade", especialidade)
      return req(`/medicos/buscar?${params}`)
    },
    solicitar: (gestanteId: string, medicoId: string) =>
      req("/medico/solicitar", { method: "POST", body: JSON.stringify({ gestanteId, medicoId }) }),
    responderSolicitacao: (requestId: string, acao: "ACEITAR" | "RECUSAR") =>
      req("/medico/solicitacao", { method: "PUT", body: JSON.stringify({ requestId, acao }) }),
  },
  cards: {
    criar: (data: Record<string, unknown>) =>
      req("/cards", { method: "POST", body: JSON.stringify(data) }),
    listar: (gestanteId: string) => req(`/cards/listar?gestanteId=${gestanteId}`),
    editar: (cardId: string, data: Record<string, unknown>) =>
      req("/cards/editar", { method: "PUT", body: JSON.stringify({ cardId, ...data }) }),
    excluir: (cardId: string) =>
      req(`/cards/excluir?cardId=${cardId}`, { method: "DELETE" }),
  },
  consultas: {
    agendar: (data: Record<string, unknown>) =>
      req("/consultas/agendar", { method: "POST", body: JSON.stringify(data) }),
    listar: (userId: string) => req(`/consultas/listar?userId=${userId}`),
  },
  chat: {
    enviar: (remetenteId: string, destinatarioId: string, mensagem: string) =>
      req("/chat/enviar", { method: "POST", body: JSON.stringify({ remetenteId, destinatarioId, mensagem }) }),
    mensagens: (userId: string, comId: string) =>
      req(`/chat/mensagens?userId=${userId}&comId=${comId}`),
  },
  agente: {
    dashboard: (userId: string, busca?: string) =>
      req(`/agente/dashboard?userId=${userId}${busca ? `&busca=${busca}` : ""}`),
  },
  acompanhante: {
    vincular: (acompanhanteId: string, codigoGestante: string) =>
      req("/acompanhante/vincular", { method: "POST", body: JSON.stringify({ acompanhanteId, codigoGestante }) }),
    dashboard: (userId: string) => req(`/acompanhante/dashboard?userId=${userId}`),
  },
}
