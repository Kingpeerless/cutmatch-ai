"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import BrandLogo from "@/components/BrandLogo";
import HairstylePhotoGallery, { type HairstyleAudience } from "@/components/HairstylePhotoGallery";

type Template = {
  id: string;
  thumb: string;
  title: string;
  category_name: string;
  keep_users_color?: boolean;
};

type TaskResult = {
  task_status?: "running" | "success" | "error";
  error?: string | null;
  error_message?: string;
  results?: { url?: string };
};

const STYLE_CATEGORIES = [
  "All styles",
  "Nigerian barbershop",
  "Short cuts, fades & tapers",
  "Afros & natural",
  "Waves",
  "Braids & cornrows",
  "Box braids",
  "Knotless braids",
  "Twists & locs",
  "Bobs & pixie cuts",
  "Long hairstyles",
  "Protective styles",
  "Wigs & other",
] as const;

type StyleCategory = (typeof STYLE_CATEGORIES)[number];

const AUDIENCE_FILTERS: { value: HairstyleAudience; label: string }[] = [
  { value: "all", label: "All styles" },
  { value: "men", label: "Men's styles" },
  { value: "women", label: "Women's styles" },
];

function matchesCategory(template: Template, category: StyleCategory) {
  const title = template.title.toLowerCase();
  switch (category) {
    case "All styles":
      return true;
    case "Short cuts, fades & tapers":
      return ["fade", "taper", "buzz", "short"].some((term) => title.includes(term));
    case "Afros & natural":
      return title.includes("afro") || title.includes("natural");
    case "Waves":
      return title.includes("wave");
    case "Braids & cornrows":
      return title.includes("braid") || title.includes("cornrow");
    case "Box braids":
      return title.includes("box braid");
    case "Knotless braids":
      return title.includes("knotless");
    case "Twists & locs":
      return title.includes("twist") || title.includes("loc") || title.includes("dreadlock");
    case "Bobs & pixie cuts":
      return title.includes("bob") || title.includes("pixie");
    case "Long hairstyles":
      return title.includes("long");
    case "Protective styles":
      return title.includes("protective");
    case "Wigs & other":
      return title.includes("wig") || title.includes("weave") || title.includes("extension");
    case "Nigerian barbershop":
      return title.includes("nigerian") || title.includes("barbershop");
  }
}

function matchesAudience(template: Template, audience: HairstyleAudience) {
  if (audience === "all") return true;
  const category = template.category_name.toLowerCase();
  const labelPattern =
    audience === "men" ? /(^|[^a-z])(male|men|man)([^a-z]|$)/ : /(^|[^a-z])(female|women|woman)([^a-z]|$)/;
  return labelPattern.test(category);
}

const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function explainError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error?: unknown }).error;
    if (typeof message === "string") return message;
  }
  return fallback;
}

async function fingerprintPreviewInputs(
  source: File,
  reference: File | null,
  templateId: string | null,
) {
  async function fingerprintFile(file: File | null) {
    if (!file) return null;
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${file.type}:${file.size}:${hash}`;
  }
  const inputs = JSON.stringify({
    source: await fingerprintFile(source),
    reference: await fingerprintFile(reference),
    templateId,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(inputs));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return diagonal ? (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 12 12 4M5 4h7v7" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8h10M8 3l5 5-5 5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.7" cy="8.7" r="5.6" />
      <path d="m13 13 4 4" />
    </svg>
  );
}

export default function Home() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [selected, setSelected] = useState<Template | null>(null);
  const [styleCategory, setStyleCategory] = useState<StyleCategory>("All styles");
  const [audience, setAudience] = useState<HairstyleAudience>("all");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState("");
  const [reference, setReference] = useState<File | null>(null);
  const [referenceLabel, setReferenceLabel] = useState("");
  const [referencePreview, setReferencePreview] = useState("");
  const [result, setResult] = useState("");
  const [resultImageError, setResultImageError] = useState("");
  const [resultTaskId, setResultTaskId] = useState("");
  const [comparison, setComparison] = useState(50);
  const [busy, setBusy] = useState(false);
  const [loadingStyles, setLoadingStyles] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");
  const sourceInput = useRef<HTMLInputElement>(null);
  const referenceInput = useRef<HTMLInputElement>(null);
  const studioRef = useRef<HTMLElement>(null);
  const idempotencyKey = useRef<{ fingerprint: string; key: string } | null>(null);

  const visibleTemplates = useMemo(() => {
    const search = query.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesSearch =
        !search ||
        template.title.toLowerCase().includes(search) ||
        template.category_name.toLowerCase().includes(search);
      return matchesSearch && matchesCategory(template, styleCategory) && matchesAudience(template, audience);
    });
  }, [audience, query, styleCategory, templates]);

  useEffect(() => {
    let active = true;
    fetch("/api/templates")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(explainError(data, "Could not load hairstyles."));
        if (!active) return;
        setTemplates(data.templates);
        setNextToken(data.nextToken);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load hairstyles.");
      })
      .finally(() => {
        if (active) setLoadingStyles(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!source) {
      setSourcePreview("");
      return;
    }
    const url = URL.createObjectURL(source);
    setSourcePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [source]);

  useEffect(() => {
    if (!reference) {
      setReferencePreview("");
      return;
    }
    const url = URL.createObjectURL(reference);
    setReferencePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [reference]);

  async function loadMore() {
    if (!nextToken || loadingMore) return;
    setError("");
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/templates?starting_token=${encodeURIComponent(nextToken)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(explainError(data, "Could not load more hairstyles."));
      setTemplates((current) => [...current, ...data.templates]);
      setNextToken(data.nextToken);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load more hairstyles.");
    } finally {
      setLoadingMore(false);
    }
  }

  function readImage(event: ChangeEvent<HTMLInputElement>, kind: "source" | "reference") {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setError("");
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      setError("Choose an image smaller than 10 MB.");
      return;
    }
    if (kind === "source") {
      idempotencyKey.current = null;
      setSource(file);
      setResult("");
      setResultImageError("");
      setResultTaskId("");
    } else {
      idempotencyKey.current = null;
      setReference(file);
      setReferenceLabel(file.name);
      setSelected(null);
    }
  }

  async function createPreview() {
    if (!source) {
      setError("Upload your photo first so we can prepare your preview.");
      sourceInput.current?.focus();
      return;
    }
    if (!reference && !selected) {
      setError("Choose a listed preset or upload a hairstyle reference.");
      return;
    }
    setBusy(true);
    setError("");
    setResult("");
    setResultImageError("");
    setResultTaskId("");
    setStatusText("Preparing your photo…");
    try {
      const fingerprint = await fingerprintPreviewInputs(
        source,
        reference,
        reference ? null : selected?.id ?? null,
      );
      if (idempotencyKey.current?.fingerprint !== fingerprint) {
        const storageKey = `cutmatch.preview-idempotency:${fingerprint}`;
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)) {
            throw new Error("The saved preview request key is invalid. Clear this tab's site data before trying again.");
          }
          idempotencyKey.current = { fingerprint, key: stored };
        }
      }
      if (idempotencyKey.current?.fingerprint !== fingerprint) {
        const key = crypto.randomUUID();
        sessionStorage.setItem(`cutmatch.preview-idempotency:${fingerprint}`, key);
        idempotencyKey.current = { fingerprint, key };
      }
      const form = new FormData();
      form.set("source", source);
      if (reference) form.set("reference", reference);
      else if (selected) form.set("templateId", selected.id);
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey.current.key },
        body: form,
      });
      const created = await response.json();
      if (!response.ok) throw new Error(explainError(created, "Could not start your preview."));

      setStatusText("Your hairstyle preview is in progress…");
      const deadline = Date.now() + 5 * 60 * 1000;
      while (Date.now() < deadline) {
        const waitMs = Math.min(10_000, deadline - Date.now());
        await new Promise((resolve) => window.setTimeout(resolve, waitMs));
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) break;

        const pollController = new AbortController();
        const pollTimeout = window.setTimeout(() => pollController.abort(), remainingMs);
        let poll: Response;
        let task: TaskResult & { error?: string };
        try {
          poll = await fetch(`/api/tasks/${encodeURIComponent(created.taskId)}`, {
            signal: pollController.signal,
          });
          task = await poll.json();
        } catch (reason) {
          if (pollController.signal.aborted) {
            throw new Error("This preview is taking longer than expected. Please try again later.");
          }
          throw reason;
        } finally {
          window.clearTimeout(pollTimeout);
        }
        if (!poll.ok) throw new Error(task.error || "Could not check preview status.");
        if (task.task_status === "success" && task.results?.url) {
          setResult(`/api/tasks/${encodeURIComponent(created.taskId)}/result`);
          setResultTaskId(created.taskId);
          setStatusText("");
          return;
        }
        if (task.task_status === "error") {
          throw new Error(task.error_message || task.error || "The AI could not process that photo.");
        }
      }
      throw new Error("This preview is taking longer than expected. Please try again later.");
    } catch (reason) {
      setStatusText("");
      setError(reason instanceof Error ? reason.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function tryAnotherStyle() {
    setResult("");
    setResultImageError("");
    setResultTaskId("");
    setStatusText("");
    studioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="cyber-studio">
      <header className="topbar">
        <a className="brand-link" href="#" aria-label="CutMatch AI home">
          <BrandLogo />
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#styles">Explore styles</a>
        </nav>
        <a className="nav-cta" href="#try">
          <span>Try a hairstyle</span>
          <ArrowIcon diagonal />
        </a>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> AI HAIRSTYLE TRY-ON</span>
          <h1>Find Your<br /><span>Perfect Cut.</span></h1>
          <p>See how different hairstyles can look on you before your next barber or salon visit.</p>
          <div className="hero-actions">
            <a className="button button-lime" href="#try">Try a hairstyle <ArrowIcon diagonal /></a>
            <a className="how-link" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-proof">
            <span className="proof-mark">✳</span>
            <span>Real hairstyle previews, powered by YouCam AI</span>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            src="/images/hairstyles/cornrows.jpg"
            alt="Portrait of a man wearing cornrows; a real hairstyle photo reference, not a CutMatch AI result."
            width={1200}
            height={1500}
            sizes="(max-width: 720px) 86vw, 52vw"
            priority
          />
          <span className="hero-visual-label"><span /> REAL PHOTO · STYLE INSPIRATION</span>
          <span className="hero-photo-credit">Photo by Omotaiyewoo via Pexels</span>
        </div>
        <div className="hero-index" aria-hidden="true">CUTMATCH / 001</div>
      </section>

      <section className="steps-section" id="how-it-works" aria-labelledby="steps-title">
        <div className="section-kicker"><span>THE PROCESS</span><span>01 — 03</span></div>
        <div className="steps-heading">
          <h2 id="steps-title">A better cut starts<br />before the chair.</h2>
          <p>Bring your next idea into focus. No guesswork, just a clearer conversation with your barber.</p>
        </div>
        <ol className="steps-grid">
          <li><span className="step-count">01</span><span className="step-icon" aria-hidden="true">↥</span><h3>Upload your photo</h3><p>Start with a clear, front-facing photo in good light.</p></li>
          <li><span className="step-count">02</span><span className="step-icon" aria-hidden="true">✳</span><h3>Choose your style</h3><p>Explore available presets or upload the exact reference you have in mind.</p></li>
          <li><span className="step-count">03</span><span className="step-icon" aria-hidden="true">↗</span><h3>Preview your look</h3><p>See an AI-generated preview and bring it to your barber or stylist for a real-world consult.</p></li>
        </ol>
      </section>

      <section className="studio-section" id="try" ref={studioRef} aria-labelledby="studio-title">
        <div className="studio-intro">
          <div>
            <div className="section-kicker"><span>THE CUTMATCH STUDIO</span><span>02 / TRY-ON</span></div>
            <h2 id="studio-title">Your next look,<br />on your terms.</h2>
          </div>
          <p>Choose a preset that’s available through YouCam, or bring a reference photo of the style you want to explore.</p>
        </div>

        <div className="workflow-grid">
          <section className="workflow-panel photo-panel" aria-labelledby="photo-heading">
            <div className="panel-heading">
              <span className="step-number">01</span>
              <div>
                <div className="workflow-heading-title"><BrandLogo compact /><h3 id="photo-heading">Your photo</h3></div>
                <p>One face, looking forward, in good light.</p>
              </div>
            </div>
            <input
              ref={sourceInput}
              className="visually-hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => readImage(event, "source")}
              aria-label="Choose your portrait photo"
            />
            <button
              className={`upload-box ${sourcePreview ? "has-image" : ""}`}
              type="button"
              onClick={() => sourceInput.current?.click()}
              disabled={busy}
            >
              {sourcePreview ? (
                <>
                  <img src={sourcePreview} alt="Your original portrait, unchanged" />
                  <span className="change-photo">Change photo</span>
                </>
              ) : (
                <>
                  <span className="upload-icon" aria-hidden="true">↥</span>
                  <strong>Choose your photo</strong>
                  <span>JPEG, PNG or WebP · under 10 MB</span>
                  <small>Clear face · one person · front-facing</small>
                </>
              )}
            </button>
            <div className="photo-guidance">
              <span aria-hidden="true">i</span>
              <p>Use a clear, front-facing image showing your full face. YouCam recommends one face and good lighting.</p>
            </div>
            <p className="privacy-note">
              When you press Generate preview, your portrait and any selected custom reference image
              are sent to YouCam for processing. Uploaded files are retained by the provider for up
              to 30 days.
            </p>
            <div className="identity-warning" role="note">
              <span aria-hidden="true">!</span>
              <p><strong>A preview, not a promise.</strong> YouCam does not document a guarantee of facial identity preservation or a face mask control. Your original photo stays unchanged, but the generated result may alter facial details. Review it carefully before sharing with your barber.</p>
            </div>
            {result && sourcePreview && (
              <section className="result-section" aria-labelledby="result-title">
                <div className="result-heading">
                  <div>
                    <div className="section-kicker"><span>YOUR PREVIEW</span><span>READY TO REVIEW</span></div>
                    <div className="result-title-row"><BrandLogo compact /><h2 id="result-title">See the difference.</h2></div>
                  </div>
                  <div className="result-actions">
                    <button type="button" className="button button-outline" onClick={tryAnotherStyle}>Try another style</button>
                    <a className="button button-lime save-button" href={`/api/tasks/${encodeURIComponent(resultTaskId)}/download`}>Save preview <ArrowIcon diagonal /></a>
                  </div>
                </div>
                <div className="result-grid">
                  <figure className="result-card">
                    <div className="result-image"><img src={sourcePreview} alt="Original uploaded portrait, unchanged" /></div>
                    <figcaption><span>01</span><strong>Your original</strong><small>Unchanged source photo</small></figcaption>
                  </figure>
                  <figure className="result-card">
                    <div className="result-image"><img src={result} alt="YouCam AI-generated hairstyle preview" onError={() => setResultImageError("The generated preview image could not be loaded. The preview request is unchanged; try Save preview or check your connection.")} /></div>
                    <figcaption><span>02</span><strong>AI hairstyle preview</strong><small>May differ from the original face and requested style</small></figcaption>
                  </figure>
                </div>
                {resultImageError && <p role="alert">{resultImageError}</p>}
                <div className="comparison-block">
                  <label htmlFor="comparison-range">Overlay comparison <output>{comparison}%</output></label>
                  <div className="comparison" style={{ "--split": `${comparison}%` } as React.CSSProperties}>
                    <img src={result} alt="" className="comparison-after" onError={() => setResultImageError("The generated preview image could not be loaded. The preview request is unchanged; try Save preview or check your connection.")} />
                    <div className="comparison-before"><img src={sourcePreview} alt="" /></div>
                    <span className="compare-label before-label">ORIGINAL</span><span className="compare-label after-label">PREVIEW</span>
                    <div className="compare-divider" aria-hidden="true">↔</div>
                  </div>
                  <input id="comparison-range" type="range" min="0" max="100" value={comparison} aria-label="Adjust original and preview overlay" onChange={(event) => setComparison(Number(event.target.value))} />
                  <p>Use the slider to compare the unchanged original with the generated preview.</p>
                </div>
                <p className="result-footnote">AI previews can be imperfect. Use this image as inspiration and confirm the cut and details with your barber.</p>
              </section>
            )}
          </section>

          <section className="workflow-panel styles-panel" id="styles" aria-labelledby="styles-heading">
            <div className="panel-heading">
              <span className="step-number">02</span>
              <div>
                <div className="workflow-heading-title"><BrandLogo compact /><h3 id="styles-heading">Choose your style</h3></div>
                <p>No gender choice is required. Browse by style, or optionally filter by the catalog's portrait labels.</p>
              </div>
            </div>

            <fieldset className="audience-filter">
              <legend>Browse by</legend>
              <div className="audience-filter-options">
                {AUDIENCE_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={audience === filter.value ? "active" : ""}
                    onClick={() => {
                      setAudience(filter.value);
                      if (selected && !matchesAudience(selected, filter.value)) {
                        idempotencyKey.current = null;
                        setSelected(null);
                      }
                    }}
                    aria-pressed={audience === filter.value}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <p>These filters describe the people shown in references or provider metadata, not who can wear a style.</p>
            </fieldset>

            <input
              ref={referenceInput}
              className="visually-hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => readImage(event, "reference")}
              aria-label="Choose a custom hairstyle reference photo"
            />
            <button
              className={`reference-upload ${referencePreview ? "reference-upload-active" : ""}`}
              type="button"
              onClick={() => referenceInput.current?.click()}
              disabled={busy}
            >
              {referencePreview ? (
                <img src={referencePreview} alt="" />
              ) : (
                <span className="reference-upload-icon" aria-hidden="true">＋</span>
              )}
              <span className="reference-upload-copy">
                <strong>{referencePreview ? "Custom reference selected" : "Have a specific cut in mind?"}</strong>
                <span>{referencePreview ? referenceLabel : "Upload a reference photo of the exact style you want."}</span>
                <small>{referencePreview ? "Choose a different reference" : "CUSTOM REFERENCE · NOT A PRESET"}</small>
              </span>
              <ArrowIcon diagonal />
            </button>
            {referencePreview && (
              <div className="reference-selected">
                <span>This image will be used instead of a preset.</span>
                <button type="button" onClick={() => { idempotencyKey.current = null; setReference(null); setReferenceLabel(""); setSelected(null); }} disabled={busy}>Remove</button>
              </div>
            )}

            <HairstylePhotoGallery
              disabled={busy}
              audience={audience}
              selectedFile={reference?.name ?? null}
              onSelect={(file, title) => {
                idempotencyKey.current = null;
                setReference(file);
                setReferenceLabel(title);
                setSelected(null);
              }}
              onError={setError}
            />

            {!referencePreview && (
              <>
                <label className="search-box">
                  <SearchIcon />
                  <input
                    type="search"
                    placeholder="Search available styles"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <span>{templates.length}{nextToken ? "+" : ""} STYLES</span>
                </label>
                <div className="style-categories" aria-label="Filter hairstyle presets">
                  {STYLE_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`${styleCategory === category ? "active" : ""}${category === "Nigerian barbershop" ? " featured" : ""}`}
                      onClick={() => {
                        setStyleCategory(category);
                        if (selected && !matchesCategory(selected, category)) {
                          idempotencyKey.current = null;
                          setSelected(null);
                        }
                      }}
                      aria-pressed={styleCategory === category}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <div className="preset-source-note">
                  Presets below are loaded from YouCam. Filters use the provider's own labels; they do not limit who can wear a style.
                </div>
                <div className="style-grid" aria-live="polite">
                  {visibleTemplates.map((template) => (
                    <button
                      key={template.id}
                      className={`style-card ${selected?.id === template.id ? "selected" : ""}`}
                      type="button"
                      onClick={() => {
                        idempotencyKey.current = null;
                        setSelected(template);
                        setReference(null);
                        setReferenceLabel("");
                      }}
                      disabled={busy}
                      aria-pressed={selected?.id === template.id}
                    >
                      <span className="style-thumb">
                        <img src={template.thumb} alt="" loading="lazy" />
                        <span className="preset-badge">YOUCAM PRESET</span>
                        {selected?.id === template.id && <span className="style-check" aria-label="Selected">✓</span>}
                      </span>
                      <span className="style-card-copy">
                        <strong>{template.title}</strong>
                        <small>{template.category_name}</small>
                      </span>
                    </button>
                  ))}
                  {loadingStyles && <div className="loading-styles"><span className="spinner" /> Loading provider styles…</div>}
                  {!loadingStyles && templates.length > 0 && visibleTemplates.length === 0 && (
                    <div className="empty-category">
                      <strong>
                        {query.trim()
                          ? "No loaded preset matches this search."
                          : audience !== "all"
                            ? `No loaded preset is labeled for ${audience === "men" ? "men" : "women"} in this category.`
                          : nextToken
                            ? "No matching preset in the styles loaded so far."
                            : "This style is not named in the available provider presets."}
                      </strong>
                      <span>
                        {nextToken
                          ? "Load more of the provider catalog, or upload a custom reference."
                          : "Upload a reference photo to try this style. The result may vary from your reference."}
                      </span>
                      {nextToken && <button type="button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading…" : "Load more styles"}</button>}
                      <button type="button" onClick={() => referenceInput.current?.click()}>Use a reference photo</button>
                    </div>
                  )}
                  {!loadingStyles && templates.length === 0 && (
                    <div className="empty-category">
                      <strong>Presets could not be loaded.</strong>
                      <span>Check the API configuration and reload the page. You can still choose a custom reference.</span>
                      <button type="button" onClick={() => referenceInput.current?.click()}>Use a reference photo</button>
                    </div>
                  )}
                </div>
                {nextToken && visibleTemplates.length > 0 && (
                  <button className="load-more" type="button" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading more styles…" : "Load more presets"} <ArrowIcon />
                  </button>
                )}
              </>
            )}

            <p className="reference-limitation">
              {selected ? <>Selected: <strong>{selected.title}</strong> · YouCam preset</> : referencePreview ? <>Selected: <strong>Custom reference</strong> · results may vary from the photo</> : "Choose an available preset or upload a custom reference."}
            </p>
          </section>
          <div className="studio-action-column">
            {error && (
              <div
                className={`error-message${error.toLowerCase().includes("may have created") || error.toLowerCase().includes("already being processed") ? " uncertain" : ""}`}
                role="alert"
              >
                <span aria-hidden="true">!</span>
                <div>
                  {error.toLowerCase().includes("may have created") || error.toLowerCase().includes("already being processed") ? (
                    <strong>Request status needs attention</strong>
                  ) : null}
                  <span>{error}</span>
                  {error.toLowerCase().includes("may have created") && (
                    <small>The same request key is retained in this tab. Do not start a new request for the same preview.</small>
                  )}
                </div>
              </div>
            )}
            {statusText && <div className="status-message" role="status"><span className="spinner" />{statusText}<small>Usually just a few moments.</small></div>}
            <div className="generate-row">
              <button className="button button-lime generate-button" type="button" onClick={createPreview} disabled={busy || loadingStyles || (!selected && !reference)}>
                {busy ? <><span className="spinner" /> Preparing preview…</> : <>Generate preview <ArrowIcon diagonal /></>}
              </button>
              <div className="generate-disclosures">
                <span>One preview starts only when you press this button.</span>
                <span>Retrying the same inputs in this tab reuses the same request key. Changing an input starts a new request and may use credits.</span>
                <span>If the durable request store is unavailable, generation fails safely before a task starts.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand-link" href="#" aria-label="CutMatch AI home"><BrandLogo /></a>
        <p>Your style. Before the chair.</p>
        <span>PREVIEWS POWERED BY YOUCAM AI</span>
      </footer>
    </main>
  );
}
