import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth"
import { calcWeek, getBabyInfo } from "@/lib/utils"
import { type AuthUser } from "@/lib/auth"
import { requireFirebase } from "@/lib/firebase"

type Role = AuthUser["role"]

interface UserRecord {
  nome: string
  email: string
  role: Role
  createdAt: string
  updatedAt: string
  dum?: string
  endereco?: string
  idade?: string
  cartaoSUS?: string
  codigoAcompanhante?: string
  medicoId?: string
  crm?: string
  especialidade?: string
  nomeRegistro?: string
  regiao?: string
  grauParentesco?: string
  gestanteId?: string
  vinculoAtivo?: boolean
}

interface SolicitacaoRecord {
  gestanteId: string
  medicoId: string
  status: "PENDENTE" | "ACEITA" | "RECUSADA"
  createdAt: string
  updatedAt: string
}

interface ConsultaRecord {
  gestanteId: string
  medicoId: string
  data: string
  hora: string
  local: string
  observacoes?: string
  googleCalendarUrl: string
  createdAt: string
}

interface CardRecord {
  gestanteId: string
  medicoId: string
  titulo: string
  descricao: string
  tipo: string
  criadoEm: string
}

interface MensagemRecord {
  participantes: string[]
  remetenteId: string
  destinatarioId: string
  mensagem: string
  timestamp: string
}

type CadastroPayload = Record<string, unknown> & {
  nome: string
  email: string
  senha: string
  role: Role
}

const COLLECTIONS = {
  users: "users",
  solicitacoes: "solicitacoes",
  consultas: "consultas",
  cards: "cards",
  mensagens: "mensagens",
}

function normalize(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function compareDateTime(a: { data: string; hora?: string }, b: { data: string; hora?: string }) {
  return `${a.data}T${a.hora ?? "00:00"}`.localeCompare(`${b.data}T${b.hora ?? "00:00"}`)
}

function buildCalendarUrl(data: string, hora: string, local: string, observacoes?: string) {
  const start = new Date(`${data}T${hora}:00`)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const fmt = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(".000", "")

  return (
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent("Consulta Pré-natal")}` +
    `&dates=${fmt(start)}/${fmt(end)}` +
    `&details=${encodeURIComponent(observacoes ?? "Consulta agendada pelo Materna")}` +
    `&location=${encodeURIComponent(local)}`
  )
}

function buildDumFromWeek(week: number, day: number) {
  const now = new Date()
  const dum = new Date(now)

  // Use midday to avoid timezone shifts when persisting as YYYY-MM-DD.
  dum.setHours(12, 0, 0, 0)
  dum.setDate(dum.getDate() - (week * 7 + day))

  return dum.toISOString().slice(0, 10)
}

function randomCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("")
}

async function generateCompanionCode() {
  const { db } = requireFirebase()

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomCode()
    const snapshot = await getDocs(
      query(collection(db, COLLECTIONS.users), where("codigoAcompanhante", "==", code)),
    )

    if (snapshot.empty) return code
  }

  throw new Error("Não foi possível gerar o código de acompanhante.")
}

async function getUserRecord(userId: string) {
  const { db } = requireFirebase()
  const snapshot = await getDoc(doc(db, COLLECTIONS.users, userId))

  if (!snapshot.exists()) {
    throw new Error("Usuário não encontrado no Firebase.")
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as UserRecord),
  }
}

async function getUsersByRole(role: Role) {
  const { db } = requireFirebase()
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.users), where("role", "==", role)))

  return snapshot.docs.map(docSnapshot => ({
    id: docSnapshot.id,
    ...(docSnapshot.data() as UserRecord),
  }))
}

function toAuthUser(user: { id: string } & UserRecord, token: string): AuthUser {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    token,
    codigoAcompanhante: user.codigoAcompanhante,
  }
}

async function getLinkedDoctor(gestanteId: string) {
  const gestante = await getUserRecord(gestanteId)

  if (!gestante.medicoId) {
    return null
  }

  const medico = await getUserRecord(gestante.medicoId)

  return {
    id: medico.id,
    nome: medico.nome,
    crm: medico.crm ?? "",
    especialidade: medico.especialidade ?? "",
  }
}

export const api = {
  auth: {
    cadastro: async (data: CadastroPayload) => {
      try {
        const { auth, db } = requireFirebase()
        const credential = await createUserWithEmailAndPassword(auth, data.email, data.senha)
        const now = new Date().toISOString()
        const baseUser: UserRecord = {
          nome: data.nome,
          email: data.email,
          role: data.role,
          createdAt: now,
          updatedAt: now,
        }

        if (data.role === "GESTANTE") {
          baseUser.dum = String(data.dum ?? "")
          baseUser.endereco = String(data.endereco ?? "")
          baseUser.idade = String(data.idade ?? "")
          baseUser.cartaoSUS = String(data.cartaoSUS ?? "")
          baseUser.codigoAcompanhante = await generateCompanionCode()
        }

        if (data.role === "MEDICO") {
          baseUser.crm = String(data.crm ?? "")
          baseUser.especialidade = String(data.especialidade ?? "")
        }

        if (data.role === "AGENTE") {
          baseUser.nomeRegistro = String(data.nomeRegistro ?? "")
          baseUser.regiao = String(data.regiao ?? "")
        }

        if (data.role === "ACOMPANHANTE") {
          baseUser.grauParentesco = String(data.grauParentesco ?? "")
          baseUser.vinculoAtivo = false
        }

        await setDoc(doc(db, COLLECTIONS.users, credential.user.uid), baseUser)
        await signOut(auth)

        return { success: true, token: "" }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro ao cadastrar no Firebase.",
        }
      }
    },

    login: async (email: string, senha: string) => {
      try {
        const { auth } = requireFirebase()
        const credential = await signInWithEmailAndPassword(auth, email, senha)
        const token = await credential.user.getIdToken()
        const user = await getUserRecord(credential.user.uid)

        return {
          success: true,
          user: toAuthUser(user, token),
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro ao autenticar no Firebase.",
        }
      }
    },
  },

  gestante: {
    dashboard: async (userId: string) => {
      const { db } = requireFirebase()
      const user = await getUserRecord(userId)
      const gestacao = calcWeek(user.dum ?? new Date().toISOString())
      const baby = getBabyInfo(gestacao.week)

      const [consultasSnapshot, cardsSnapshot, doctor] = await Promise.all([
        getDocs(query(collection(db, COLLECTIONS.consultas), where("gestanteId", "==", userId))),
        getDocs(query(collection(db, COLLECTIONS.cards), where("gestanteId", "==", userId))),
        getLinkedDoctor(userId),
      ])

      const proximasConsultas = consultasSnapshot.docs
        .map(docSnapshot => ({ id: docSnapshot.id, ...(docSnapshot.data() as ConsultaRecord) }))
        .sort(compareDateTime)

      const cardsInformativos = cardsSnapshot.docs
        .map(docSnapshot => ({ id: docSnapshot.id, ...(docSnapshot.data() as CardRecord) }))
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))

      return {
        usuario: {
          nome: user.nome,
          email: user.email,
          endereco: user.endereco,
          cartaoSUS: user.cartaoSUS,
          codigoAcompanhante: user.codigoAcompanhante,
        },
        gestacao: {
          semanaAtual: gestacao.week,
          diaAtual: gestacao.day,
          progresso: gestacao.progress,
          icone: baby.icon,
          dum: user.dum ?? "",
        },
        proximasConsultas,
        cardsInformativos,
        chat: { mensagens: [], totalNaoLidas: 0 },
        medicoVinculado: doctor ? { id: doctor.id, nome: doctor.nome } : null,
      }
    },

    semana: async (userId: string) => {
      const user = await getUserRecord(userId)
      const gestacao = calcWeek(user.dum ?? new Date().toISOString())
      const baby = getBabyInfo(gestacao.week)

      return {
        semanaAtual: gestacao.week,
        diaAtual: gestacao.day,
        progresso: gestacao.progress,
        ...baby,
      }
    },

    atualizarSemana: async (userId: string, semanaAtual: number, senha: string) => {
      const { auth, db } = requireFirebase()

      if (!Number.isInteger(semanaAtual) || semanaAtual < 1 || semanaAtual > 42) {
        throw new Error("Informe uma semana entre 1 e 42.")
      }

      if (!senha.trim()) {
        throw new Error("Confirme sua senha para alterar a semana.")
      }

      if (!auth.currentUser || auth.currentUser.uid !== userId) {
        throw new Error("Sua sessão expirou. Entre novamente para continuar.")
      }

      const user = await getUserRecord(userId)

      if (user.role !== "GESTANTE") {
        throw new Error("Apenas gestantes podem editar a semana.")
      }

      const credential = EmailAuthProvider.credential(user.email, senha)
      await reauthenticateWithCredential(auth.currentUser, credential)

      const gestacaoAtual = calcWeek(user.dum ?? new Date().toISOString())
      const novaDum = buildDumFromWeek(semanaAtual, Math.max(0, gestacaoAtual.day))

      await updateDoc(doc(db, COLLECTIONS.users, userId), {
        dum: novaDum,
        updatedAt: new Date().toISOString(),
      })

      const novaGestacao = calcWeek(novaDum)

      return {
        success: true,
        gestacao: {
          semanaAtual: novaGestacao.week,
          diaAtual: novaGestacao.day,
          progresso: novaGestacao.progress,
          icone: getBabyInfo(novaGestacao.week).icon,
          dum: novaDum,
        },
      }
    },
  },

  medico: {
    dashboard: async (userId: string) => {
      const { db } = requireFirebase()
      const [medico, gestantes, solicitacoesSnapshot, consultasSnapshot] = await Promise.all([
        getUserRecord(userId),
        getUsersByRole("GESTANTE"),
        getDocs(query(collection(db, COLLECTIONS.solicitacoes), where("medicoId", "==", userId))),
        getDocs(query(collection(db, COLLECTIONS.consultas), where("medicoId", "==", userId))),
      ])

      const minhasGestantes = gestantes
        .filter(gestante => gestante.medicoId === userId)
        .map(gestante => ({
          id: gestante.id,
          nome: gestante.nome,
          email: gestante.email,
          cartaoSUS: gestante.cartaoSUS ?? "",
          semanaAtual: calcWeek(gestante.dum ?? new Date().toISOString()).week,
          dum: gestante.dum,
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome))

      const solicitacoesPendentes = solicitacoesSnapshot.docs
        .map(docSnapshot => ({ id: docSnapshot.id, ...(docSnapshot.data() as SolicitacaoRecord) }))
        .filter(solicitacao => solicitacao.status === "PENDENTE")

      const hoje = new Date().toISOString().slice(0, 10)
      const consultasHoje = consultasSnapshot.docs
        .map(docSnapshot => docSnapshot.data() as ConsultaRecord)
        .filter(consulta => consulta.data === hoje).length

      return {
        medico: {
          nome: medico.nome,
          crm: medico.crm ?? "",
          especialidade: medico.especialidade ?? "",
        },
        resumo: {
          totalGestantes: minhasGestantes.length,
          consultasHoje,
          alertasPendentes: solicitacoesPendentes.length,
        },
        gestantes: minhasGestantes,
        solicitacoesPendentes,
      }
    },

    buscar: async (busca?: string, especialidade?: string) => {
      const medicos = await getUsersByRole("MEDICO")
      const q = normalize(busca)
      const esp = normalize(especialidade)

      return {
        medicos: medicos
          .filter(medico => {
            const matchesSearch =
              !q ||
              normalize(medico.nome).includes(q) ||
              normalize(medico.crm).includes(q) ||
              normalize(medico.email).includes(q)
            const matchesSpecialty = !esp || normalize(medico.especialidade).includes(esp)
            return matchesSearch && matchesSpecialty
          })
          .map(medico => ({
            id: medico.id,
            nome: medico.nome,
            crm: medico.crm ?? "",
            especialidade: medico.especialidade ?? "",
          })),
      }
    },

    solicitar: async (gestanteId: string, medicoId: string) => {
      const { db } = requireFirebase()
      const existingSnapshot = await getDocs(
        query(collection(db, COLLECTIONS.solicitacoes), where("gestanteId", "==", gestanteId)),
      )

      const alreadyRequested = existingSnapshot.docs.some(docSnapshot => {
        const data = docSnapshot.data() as SolicitacaoRecord
        return data.medicoId === medicoId && data.status === "PENDENTE"
      })

      if (alreadyRequested) {
        throw new Error("Já existe uma solicitação pendente para esse médico.")
      }

      const now = new Date().toISOString()
      await addDoc(collection(db, COLLECTIONS.solicitacoes), {
        gestanteId,
        medicoId,
        status: "PENDENTE",
        createdAt: now,
        updatedAt: now,
      } satisfies SolicitacaoRecord)

      return { success: true }
    },

    responderSolicitacao: async (requestId: string, acao: "ACEITAR" | "RECUSAR") => {
      const { db } = requireFirebase()
      const requestRef = doc(db, COLLECTIONS.solicitacoes, requestId)
      const requestSnapshot = await getDoc(requestRef)

      if (!requestSnapshot.exists()) {
        throw new Error("Solicitação não encontrada.")
      }

      const requestData = requestSnapshot.data() as SolicitacaoRecord
      const status = acao === "ACEITAR" ? "ACEITA" : "RECUSADA"

      await updateDoc(requestRef, {
        status,
        updatedAt: new Date().toISOString(),
      })

      if (acao === "ACEITAR") {
        await updateDoc(doc(db, COLLECTIONS.users, requestData.gestanteId), {
          medicoId: requestData.medicoId,
          updatedAt: new Date().toISOString(),
        })
      }

      return { success: true }
    },
  },

  cards: {
    criar: async (data: Record<string, unknown>) => {
      const { db } = requireFirebase()
      const now = new Date().toISOString()

      const payload: CardRecord = {
        gestanteId: String(data.gestanteId ?? ""),
        medicoId: String(data.medicoId ?? ""),
        titulo: String(data.titulo ?? ""),
        descricao: String(data.descricao ?? ""),
        tipo: String(data.tipo ?? "DICA"),
        criadoEm: now,
      }

      const snapshot = await addDoc(collection(db, COLLECTIONS.cards), payload)
      return { id: snapshot.id, ...payload }
    },

    listar: async (gestanteId: string) => {
      const { db } = requireFirebase()
      const snapshot = await getDocs(query(collection(db, COLLECTIONS.cards), where("gestanteId", "==", gestanteId)))

      return {
        cards: snapshot.docs
          .map(docSnapshot => ({ id: docSnapshot.id, ...(docSnapshot.data() as CardRecord) }))
          .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
      }
    },

    editar: async (cardId: string, data: Record<string, unknown>) => {
      const { db } = requireFirebase()
      await updateDoc(doc(db, COLLECTIONS.cards, cardId), data)
      return { success: true }
    },

    excluir: async (cardId: string) => {
      const { db } = requireFirebase()
      await deleteDoc(doc(db, COLLECTIONS.cards, cardId))
      return { success: true }
    },
  },

  consultas: {
    agendar: async (data: Record<string, unknown>) => {
      const { db } = requireFirebase()
      const payload: ConsultaRecord = {
        gestanteId: String(data.gestanteId ?? ""),
        medicoId: String(data.medicoId ?? ""),
        data: String(data.data ?? ""),
        hora: String(data.hora ?? ""),
        local: String(data.local ?? ""),
        observacoes: String(data.observacoes ?? ""),
        googleCalendarUrl: buildCalendarUrl(
          String(data.data ?? ""),
          String(data.hora ?? ""),
          String(data.local ?? ""),
          String(data.observacoes ?? ""),
        ),
        createdAt: new Date().toISOString(),
      }

      const snapshot = await addDoc(collection(db, COLLECTIONS.consultas), payload)
      return {
        consulta: {
          id: snapshot.id,
          ...payload,
        },
      }
    },

    listar: async (userId: string) => {
      const { db } = requireFirebase()
      const user = await getUserRecord(userId)
      const field = user.role === "MEDICO" ? "medicoId" : "gestanteId"
      const snapshot = await getDocs(query(collection(db, COLLECTIONS.consultas), where(field, "==", userId)))

      return {
        consultas: snapshot.docs
          .map(docSnapshot => ({ id: docSnapshot.id, ...(docSnapshot.data() as ConsultaRecord) }))
          .sort(compareDateTime),
      }
    },
  },

  chat: {
    enviar: async (remetenteId: string, destinatarioId: string, mensagem: string) => {
      const { db } = requireFirebase()
      const payload: MensagemRecord = {
        participantes: [remetenteId, destinatarioId].sort(),
        remetenteId,
        destinatarioId,
        mensagem,
        timestamp: new Date().toISOString(),
      }

      const snapshot = await addDoc(collection(db, COLLECTIONS.mensagens), payload)
      return { id: snapshot.id, ...payload }
    },

    mensagens: async (userId: string, comId: string) => {
      const { db } = requireFirebase()
      const snapshot = await getDocs(
        query(collection(db, COLLECTIONS.mensagens), where("participantes", "array-contains", userId)),
      )

      return {
        mensagens: snapshot.docs
          .map(docSnapshot => ({ id: docSnapshot.id, ...(docSnapshot.data() as MensagemRecord) }))
          .filter(mensagem => mensagem.participantes.includes(comId))
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      }
    },
  },

  agente: {
    dashboard: async (userId: string, busca?: string) => {
      const agente = await getUserRecord(userId)
      const gestantes = await getUsersByRole("GESTANTE")
      const regionalizadas = gestantes.filter(gestante =>
        agente.regiao ? normalize(gestante.endereco).includes(normalize(agente.regiao)) : true,
      )
      const q = normalize(busca)

      const filtradas = regionalizadas.filter(gestante => {
        if (!q) return true

        return [
          gestante.nome,
          gestante.cartaoSUS,
          gestante.endereco,
          gestante.email,
        ].some(value => normalize(value).includes(q))
      })

      return {
        agente: {
          nome: agente.nome,
          regiao: agente.regiao ?? "",
        },
        totalGestantes: regionalizadas.length,
        gestantes: filtradas
          .map(gestante => ({
            id: gestante.id,
            nome: gestante.nome,
            email: gestante.email,
            cartaoSUS: gestante.cartaoSUS,
            endereco: gestante.endereco,
            semanaAtual: calcWeek(gestante.dum ?? new Date().toISOString()).week,
            medicoVinculado: gestante.medicoId,
          }))
          .sort((a, b) => a.nome.localeCompare(b.nome)),
      }
    },
  },

  acompanhante: {
    vincular: async (acompanhanteId: string, codigoGestante: string) => {
      const { db } = requireFirebase()
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.users),
          where("codigoAcompanhante", "==", codigoGestante.toUpperCase()),
        ),
      )

      if (snapshot.empty) {
        throw new Error("Código de acompanhante inválido.")
      }

      const gestante = snapshot.docs[0]
      await updateDoc(doc(db, COLLECTIONS.users, acompanhanteId), {
        gestanteId: gestante.id,
        vinculoAtivo: true,
        updatedAt: new Date().toISOString(),
      })

      return { success: true }
    },

    dashboard: async (userId: string) => {
      const acompanhante = await getUserRecord(userId)

      return {
        acompanhante: {
          nome: acompanhante.nome,
          grauParentesco: acompanhante.grauParentesco ?? "Acompanhante",
        },
        gestanteId: acompanhante.gestanteId,
        vinculoAtivo: Boolean(acompanhante.vinculoAtivo && acompanhante.gestanteId),
      }
    },
  },
}
