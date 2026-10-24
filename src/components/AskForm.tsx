"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const MAX_LEN = 500;

export default function AskForm() {
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || status === "sending") return;
    setStatus("sending");
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("questions")
      .insert({ question: trimmed });
    if (error) {
      setStatus("error");
    } else {
      setQuestion("");
      setStatus("sent");
    }
  }

  return (
    <form onSubmit={submit} className="brutal rotate-[0.3deg] bg-yolk p-5">
      <label htmlFor="qna-question" className="font-display text-xl">
        Ask me anything 💬
      </label>
      <p className="mt-1 text-sm font-bold">
        100% anonymous — I only see the question.
      </p>
      <textarea
        id="qna-question"
        value={question}
        onChange={(e) => {
          setQuestion(e.target.value.slice(0, MAX_LEN));
          if (status !== "idle") setStatus("idle");
        }}
        placeholder="Type your question…"
        rows={3}
        className="brutal-sm mt-3 w-full resize-y bg-paper px-3 py-2"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!question.trim() || status === "sending"}
          className="brutal-btn bg-bubble px-4 py-2 disabled:opacity-50"
        >
          {status === "sending" ? "SENDING…" : "SEND IT →"}
        </button>
        <span className="ml-auto text-sm font-bold">
          {question.length}/{MAX_LEN}
        </span>
      </div>
      {status === "sent" && (
        <p className="sticker mt-3 bg-lime text-sm">
          Sent! It&apos;ll show up here once I answer it. ✨
        </p>
      )}
      {status === "error" && (
        <p className="sticker mt-3 bg-tangerine text-sm">
          Something went wrong — try again?
        </p>
      )}
    </form>
  );
}
