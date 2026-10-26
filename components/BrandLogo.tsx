type BrandLogoProps = {
  compact?: boolean;
  inverse?: boolean;
};

export default function BrandLogo({ compact = false, inverse = false }: BrandLogoProps) {
  return (
    <span className={`brand-lockup${inverse ? " brand-lockup-inverse" : ""}${compact ? " brand-lockup-compact" : ""}`}>
      <svg
        className="brand-symbol"
        viewBox="0 0 48 48"
        role={compact ? undefined : "img"}
        aria-label={compact ? undefined : "CutMatch profile and haircut mark"}
        aria-hidden={compact ? true : undefined}
      >
        <rect className="brand-symbol-bg" x="1" y="1" width="46" height="46" rx="13" />
        <path
          className="brand-symbol-hair"
          d="M12.1 31.6c-2.7-1.2-3.7-4.3-2.2-6.7-2.1-2.7-.9-6.2 1.9-7.4-.1-3.1 2.6-5.4 5.6-4.9 1.1-3 4.5-4.1 7.1-2.3 2.4-2 5.9-1.4 7.3 1.4 3.1-.2 5.5 2.4 5 5.5 2.4 1.9 2.2 5.5-.4 7.2"
        />
        <path
          className="brand-symbol-face"
          d="M15.1 19.5c2.5-3.3 6-5 10.1-5 4.4 0 7.4 2.4 8.1 6.2l.3 1.5 3.4 2.3-2.7 1.8 1.2 1.7-2.4 1.2-.5 3.2-3.9 1.4-1.1 5.1h-8.7l-.6-5c-3.5-1.2-5.7-4.3-5.9-8.1"
        />
        <path className="brand-symbol-profile" d="m34.5 23.2 2.3 1.3-2.1 1.2 1.2 1.7-2.4 1.2" />
        <path className="brand-symbol-neck" d="M18.8 33.1c2.1 1.2 5.2 1.4 7.5.5" />
        <path className="brand-symbol-accent" d="M11.8 29.7c-1.4-1.3-1.5-3.1-.6-4.6m5.2-12.1c1.2-1.5 3-2 4.8-1.4" />
      </svg>
      {!compact && (
        <span className="brand-words">
          <span className="brand-wordmark">CutMatch <span>AI</span></span>
          <span className="brand-tagline">Your style. Before the chair.</span>
        </span>
      )}
    </span>
  );
}
