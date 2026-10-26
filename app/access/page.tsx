"use client";

import { FormEvent, useEffect, useState } from "react";
import BrandLogo from "@/components/BrandLogo";

export default function DemoAccessPage() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/demo-access", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not check demo access.");
        const status = (await response.json()) as {
          configured: boolean;
          authorized: boolean;
        };
        if (!active) return;
        if (status.authorized) {
          window.location.replace("/");
        } else if (!status.configured) {
          setMessage("Private demo access is not configured. Contact the demo organizer.");
        }
      })
      .catch(() => {
        if (active) setMessage("Could not check demo access. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code || submitting) return;
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/demo-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not verify the access code.");
      setCode("");
      window.location.replace("/");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not verify the access code.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="demo-access-page">
      <a className="brand-link" href="/" aria-label="CutMatch AI home">
        <BrandLogo />
      </a>
      <section className="demo-access-card" aria-labelledby="demo-access-title">
        <span className="eyebrow"><span className="eyebrow-dot" /> PRIVATE HACKATHON DEMO</span>
        <h1 id="demo-access-title">Welcome to<br /><span>the studio.</span></h1>
        <p>Enter the private access code shared by the demo organizer.</p>
        <form onSubmit={submit}>
          <label htmlFor="demo-access-code">Access code</label>
          <input
            autoComplete="one-time-code"
            autoCapitalize="none"
            id="demo-access-code"
            name="code"
            type="password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            disabled={loading || submitting || Boolean(message.includes("not configured"))}
            required
          />
          <button className="button button-lime" type="submit" disabled={loading || submitting || !code}>
            {loading ? "Checking demo…" : submitting ? "Verifying…" : "Enter CutMatch AI"}
          </button>
        </form>
        <p className="demo-access-message" role="status" aria-live="polite">
          {message || (loading ? "Checking access…" : "")}
        </p>
      </section>
    </main>
  );
}
