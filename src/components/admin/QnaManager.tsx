"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Question } from "@/lib/types";
import GifPicker from "./GifPicker";

const supabase = supabaseBrowser();

const COLUMNS = "id, question, answer, answer_gif, answered_at, created_at";

export default function QnaManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Pending GIF choice per question; "" means "remove the existing GIF".
  const [gifDrafts, setGifDrafts] = useState<Record<string, string>>({});
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("questions")
      .select(COLUMNS)
      .order("created_at", { ascending: false });
    if (error) setMessage(`Load failed: ${error.message}`);
    else setQuestions((data ?? []) as Question[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase
      .from("questions")
      .select(COLUMNS)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setMessage(`Load failed: ${error.message}`);
        else setQuestions((data ?? []) as Question[]);
        setLoading(false);
      });
  }, []);

  function gifFor(q: Question) {
    return gifDrafts[q.id] !== undefined ? gifDrafts[q.id] : (q.answer_gif ?? "");
  }

  async function saveAnswer(q: Question) {
    const draft = (drafts[q.id] ?? q.answer ?? "").trim();
    const gif = gifFor(q);
    // A GIF on its own is a valid reply, so either one publishes the question.
    const hasContent = Boolean(draft || gif);
    setBusy(q.id);
    const { error } = await supabase
      .from("questions")
      .update({
        answer: draft || null,
        answer_gif: gif || null,
        answered_at: hasContent
          ? (q.answered_at ?? new Date().toISOString())
          : null,
      })
      .eq("id", q.id);
    if (error) setMessage(`Save failed: ${error.message}`);
    else {
      setMessage(
        hasContent ? "Answer published ✔" : "Answer removed — question is hidden again"
      );
      setGifDrafts((g) => {
        const next = { ...g };
        delete next[q.id];
        return next;
      });
      setPickerFor(null);
      await load();
    }
    setBusy(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this question permanently?")) return;
    setBusy(id);
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) setMessage(`Delete failed: ${error.message}`);
    else {
      setMessage("Question deleted");
      setQuestions((qs) => qs.filter((q) => q.id !== id));
    }
    setBusy(null);
  }

  const unanswered = questions.filter((q) => !q.answer && !q.answer_gif);
  const answered = questions.filter((q) => q.answer || q.answer_gif);

  if (loading) return <p className="font-bold">Loading questions…</p>;

  return (
    <div className="flex flex-col gap-8">
      {message && (
        <p className="sticker self-start bg-lime text-sm">{message}</p>
      )}

      {[
        { label: `INBOX (${unanswered.length})`, list: unanswered, color: "bg-tangerine" },
        { label: `ANSWERED (${answered.length})`, list: answered, color: "bg-lime" },
      ].map((section) => (
        <section key={section.label}>
          <h2 className={`sticker mb-4 text-lg ${section.color}`}>
            {section.label}
          </h2>
          {section.list.length === 0 ? (
            <p className="font-bold opacity-60">Nothing here.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {section.list.map((q) => (
                <div key={q.id} className="brutal-sm bg-paper p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <p className="flex-1 font-bold">{q.question}</p>
                    <span className="text-xs font-bold opacity-60">
                      {new Date(q.created_at).toLocaleString("en-GB")}
                    </span>
                  </div>
                  <textarea
                    defaultValue={q.answer ?? ""}
                    placeholder="Write your answer… (leave empty to hide the question)"
                    rows={3}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [q.id]: e.target.value }))
                    }
                    className="brutal-sm mt-3 w-full resize-y bg-paper px-3 py-2"
                  />
                  {gifFor(q) && (
                    <div className="brutal-sm mt-3 flex items-center gap-3 bg-paper p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gifFor(q)}
                        alt="Attached GIF"
                        className="h-20 w-auto"
                      />
                      <span className="text-xs font-bold opacity-60">
                        {gifDrafts[q.id] !== undefined ? "not saved yet" : "attached"}
                      </span>
                      <button
                        onClick={() => setGifDrafts((g) => ({ ...g, [q.id]: "" }))}
                        className="brutal-btn ml-auto bg-bubble px-2 py-1 text-xs"
                      >
                        REMOVE GIF
                      </button>
                    </div>
                  )}

                  {pickerFor === q.id && (
                    <GifPicker
                      onPick={(url) => {
                        setGifDrafts((g) => ({ ...g, [q.id]: url }));
                        setPickerFor(null);
                      }}
                      onClose={() => setPickerFor(null)}
                    />
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => saveAnswer(q)}
                      disabled={busy === q.id}
                      className="brutal-btn bg-sky px-3 py-1 text-sm disabled:opacity-50"
                    >
                      {q.answer || q.answer_gif ? "UPDATE" : "PUBLISH ANSWER"}
                    </button>
                    <button
                      onClick={() =>
                        setPickerFor((cur) => (cur === q.id ? null : q.id))
                      }
                      disabled={busy === q.id}
                      className="brutal-btn bg-grape px-3 py-1 text-sm disabled:opacity-50"
                    >
                      {gifFor(q) ? "CHANGE GIF" : "+ GIF"}
                    </button>
                    <button
                      onClick={() => remove(q.id)}
                      disabled={busy === q.id}
                      className="brutal-btn ml-auto bg-bubble px-3 py-1 text-sm disabled:opacity-50"
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
