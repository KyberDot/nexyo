"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";

// 1. Move the logic into a separate internal component
function VerifyContent() {
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

    if (hasAttempted.current) return;
    hasAttempted.current = true;

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
    <div style={{ padding: 40, background: "#1A1D27", borderRadius: 12, border: "1px solid #2A2D3A", textAlign: "center" }}>
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>{status}</h2>
    </div>
  );
}

// 2. The main page component wraps the content in Suspense
export default function VerifyPage() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#0F1117", color: "white", fontFamily: "sans-serif" }}>
      <Suspense fallback={
        <div style={{ padding: 40, background: "#1A1D27", borderRadius: 12, border: "1px solid #2A2D3A", textAlign: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Loading...</h2>
        </div>
      }>
        <VerifyContent />
      </Suspense>
    </div>
  );
}