import { getApp, getApps, initializeApp } from "firebase/app"
import { getAnalytics, isSupported } from "firebase/analytics"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

const requiredConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
}

const missingKeys = Object.entries(requiredConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key)

const isConfigured = missingKeys.length === 0
const app = isConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null

export const firebaseApp = app
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const analyticsPromise =
  typeof window !== "undefined" && app
    ? isSupported().then(supported => (supported ? getAnalytics(app) : null))
    : Promise.resolve(null)

export function requireFirebase() {
  if (!auth || !db) {
    throw new Error(
      `Firebase não configurado. Variáveis ausentes: ${missingKeys.join(", ") || "desconhecido"}.`,
    )
  }

  return { auth, db }
}
