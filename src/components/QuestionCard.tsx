"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";

const COLORS = ["bg-bubble", "bg-sky", "bg-lime", "bg-grape", "bg-tangerine"];

export default function QuestionCard({
  q,
  index,
}: {
  q: Question;
  index: number;
}) {
  const [flipped, setFlipped] = useState(false);
  const color = COLORS[index % COLORS.length];

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
      className={`flip-card h-64 w-full text-left ${flipped ? "flipped" : ""} transition-transform hover:-translate-y-1`}
    >
      <div className="flip-inner">
        <div className={`flip-face brutal flex flex-col p-5 ${color}`}>
          <span className="font-display text-4xl leading-none">Q.</span>
          <p className="mt-2 flex-1 overflow-y-auto font-bold">{q.question}</p>
          <span className="mt-2 text-xs font-bold opacity-70">
            tap to flip ↻
          </span>
        </div>
        <div className="flip-face flip-back brutal flex flex-col bg-ink p-5 text-paper">
          <span className={`font-display text-4xl leading-none`}>A.</span>
          <div className="mt-2 flex-1 overflow-y-auto">
            {q.answer && <p className="whitespace-pre-wrap">{q.answer}</p>}
            {q.answer_gif && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={q.answer_gif}
                alt="GIF reply"
                loading="lazy"
                className={`w-full border-3 border-paper object-contain ${
                  q.answer ? "mt-2" : ""
                }`}
              />
            )}
          </div>
          {q.answered_at && (
            <span className="mt-2 text-xs font-bold opacity-70">
              {new Date(q.answered_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
