import { supabaseServer } from "@/lib/supabase/server";
import AskForm from "@/components/AskForm";
import QuestionCard from "@/components/QuestionCard";
import type { Question } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Q&A — Qian Hui" };

async function getAnswered(): Promise<Question[]> {
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from("questions")
      .select("id, question, answer, answer_gif, answered_at, created_at")
      .or("answer.not.is.null,answer_gif.not.is.null")
      .order("answered_at", { ascending: false });
    return (data ?? []) as Question[];
  } catch {
    return [];
  }
}

export default async function QnaPage() {
  const questions = await getAnswered();

  return (
    <div>
      <h1 className="sticker mb-8 bg-grape text-3xl sm:text-4xl">
        Q&amp;A
      </h1>
      <div className="mb-10 max-w-xl">
        <AskForm />
      </div>
      {questions.length === 0 ? (
        <div className="brutal bg-paper p-6">
          <p className="font-bold">
            Nothing answered yet — be the first to ask something! 👆
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {questions.map((q, i) => (
              <QuestionCard key={q.id} q={q} index={i} />
            ))}
          </div>
          {questions.some((q) => q.answer_gif) && (
            <p className="mt-8 text-sm font-bold opacity-60">Powered by GIPHY</p>
          )}
        </>
      )}
    </div>
  );
}
