import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Materna — Saúde na Gestação",
  description: "Acompanhamento completo da sua gravidez",
}

export const viewport: Viewport = {
  themeColor: "#07070e",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="noise min-h-screen bg-bg antialiased">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: { background: "#0f0f1a", border: "1px solid #1e1e30", color: "#e2e2f0" },
          }}
        />
      </body>
    </html>
  )
}
