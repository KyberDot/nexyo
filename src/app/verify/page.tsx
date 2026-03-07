"use client";
import { useEffect, useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("Verifying your magic link...");
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("Invalid or missing token.");
      return;
    }

    // Prevent double-firing in React Strict Mode
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    // Securely POST the token to the magic-link provider
    signIn("magic-link", { token: token, redirect: false })
      .then((res) => {
        if (res?.error) {
          setStatus(res.error || "Invalid or expired link.");
        } else {
          setStatus("Success! Redirecting to your dashboard...");
          router.push("/dashboard");
        }
      })
      .catch(() => {
        setStatus("A network error occurred.");
      });
  }, [token, router]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--background, #0F1117)", color: "white", fontFamily: "sans-serif" }}>
      <div style={{ padding: 40, background: "var(--surface, #1A1D27)", borderRadius: 12, border: "1px solid var(--border-color, #2A2D3A)", textAlign: "center" }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>{status}</h2>
      </div>
    </div>
  );
}