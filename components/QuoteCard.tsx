"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Interpretation = {
  id?: string;
  authorName: string;
  content: string;
  upvotes: number;
};

type QuoteCardProps = {
  quoteId: string; // 👈 NEW: we need the quote's ID from DB
  quote: string;
  author: string;
  era?: string;
  tags?: string[];
  interpretations: Interpretation[];
};

export function QuoteCard({
  quoteId,
  quote,
  author,
  era,
  tags,
  interpretations,
}: QuoteCardProps) {
  const [localInterpretations, setLocalInterpretations] =
    useState<Interpretation[]>(interpretations);

  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddInterpretation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const authorName = name.trim() || "Anonymous";
    const content = text.trim();

    // 👉 Actually save to Supabase and get the saved row back
    const { data, error } = await supabase
      .from("interpretations")
      .insert({
        quote_id: quoteId,
        author_name: authorName,
        content,
        upvotes: 0,
      })
      .select("id, author_name, content, upvotes")
      .single();

    if (error) {
      console.error("Error inserting interpretation:", error.message);
      setErrorMsg("Could not save to server. Please try again.");
      setIsSubmitting(false);
      return;
    }

    if (data) {
      // Update UI using the row returned from Supabase
      setLocalInterpretations((prev) => [
        {
          id: data.id,
          authorName: data.author_name || "Anonymous",
          content: data.content,
          upvotes: data.upvotes ?? 0,
        },
        ...prev,
      ]);
    }

    setText("");
    setIsSubmitting(false);
  };

  return (
    <article className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-sm">
      {/* Quote text */}
      <div className="mb-3 border-l-2 border-zinc-600 pl-3">
        <p className="text-sm italic leading-relaxed text-zinc-100">
          “{quote}”
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
          <span>— {author}</span>
          {era && <span>· {era}</span>}
        </div>
      </div>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-zinc-300">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-zinc-700 px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Add interpretation form */}
      <form
        onSubmit={handleAddInterpretation}
        className="mb-3 space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-xs"
      >
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-1/3 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
          <textarea
            placeholder="How do YOU interpret this quote?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">
            Keep it respectful. This is your personal reading of the quote.
          </span>
          <button
            type="submit"
            disabled={isSubmitting || !text.trim()}
            className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-500"
          >
            {isSubmitting ? "Adding..." : "Add interpretation"}
          </button>
        </div>
        {errorMsg && (
          <p className="mt-1 text-[10px] text-red-400">{errorMsg}</p>
        )}
      </form>

      {/* Interpretations list */}
      <div className="space-y-3">
        {localInterpretations.length === 0 && (
          <p className="text-[11px] text-zinc-500">
            No interpretations yet. Be the first to share how this quote hits
            you.
          </p>
        )}

        {localInterpretations.map((interp, index) => (
          <div
            key={interp.id ?? index}
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-xs text-zinc-200"
          >
            <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-400">
              <span>{interp.authorName}</span>
              <button className="flex items-center gap-1 rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] hover:border-zinc-500 hover:bg-zinc-900">
                ▲ {interp.upvotes}
              </button>
            </div>
            <p className="leading-relaxed">{interp.content}</p>
          </div>
        ))}
      </div>

      {/* Actions row (placeholder for now) */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
        <button className="rounded-full border border-zinc-700 px-2 py-0.5 hover:border-zinc-500 hover:bg-zinc-900">
          Save
        </button>
        <button className="rounded-full border border-zinc-800 px-2 py-0.5 hover:border-zinc-700 hover:bg-zinc-950">
          Share
        </button>
      </div>
    </article>
  );
}
