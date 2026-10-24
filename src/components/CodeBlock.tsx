"use client";

import { useEffect, useRef, useState } from "react";

export default function CodeBlock({
  text,
  language,
}: {
  text: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API needs a secure context; fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(ta);
      }
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="md-code">
      <button
        type="button"
        onClick={copy}
        className="md-copy"
        aria-label={copied ? "Code copied" : "Copy code"}
        title={copied ? "Copied!" : "Copy code"}
      >
        {copied ? (
          <>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M2.5 8.5 6 12l7.5-8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="square"
              />
            </svg>
            COPIED
          </>
        ) : (
          <>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect
                x="5.25"
                y="1.25"
                width="9.5"
                height="11.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M11 14.75H1.25V3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="square"
              />
            </svg>
            COPY
          </>
        )}
      </button>
      <pre>
        <code className={language ? `language-${language}` : undefined}>
          {text}
        </code>
      </pre>
    </div>
  );
}
