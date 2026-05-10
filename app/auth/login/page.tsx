"use client"
import { useMemo } from "react"

export default function LoginPage() {
  const loginHref = useMemo(() => "/auth/login/redirect", [])

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-base)" }}>
      <div style={{ width: "100%", maxWidth: 520, padding: 36, borderRadius: 24, background: "var(--bg-card)", boxShadow: "0 24px 80px rgba(15, 23, 42, 0.12)" }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>
          Sign in with Google
        </h1>
        <p style={{ marginTop: 14, marginBottom: 24, color: "var(--text-muted)", lineHeight: 1.6, textAlign: "center" }}>
          Use Google OAuth to securely sign in and create an account for Axiom.
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <a
            href={loginHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 22px",
              borderRadius: 999,
              background: "#3367D6",
              color: "white",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Continue with Google
          </a>
        </div>
      </div>
    </div>
  )
}
