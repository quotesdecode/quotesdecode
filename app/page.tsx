import { QuoteCard } from "../components/QuoteCard";
import { supabase } from "../lib/supabaseClient";

type DbInterpretation = {
  id: string;
  author_name: string | null;
  content: string;
  upvotes: number | null;
};

type DbQuoteRow = {
  id: string;
  text: string;
  author: string;
  era: string | null;
  tags: string[] | null;
  interpretations: DbInterpretation[] | null;
};

export default async function Home() {
  const { data, error } = await supabase
    .from("quotes")
    .select(
      `
      id,
      text,
      author,
      era,
      tags,
      interpretations (
        id,
        author_name,
        content,
        upvotes
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading quotes:", error.message);
  }

  const quotes = (data ?? []) as DbQuoteRow[];

  return (
    <div>
      {/* Intro */}
      <section className="mb-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Decode quotes together.
        </h2>
        <p className="mt-2 text-sm text-zinc-300">
          Welcome to QuotesDecode — a community where people interpret quotes
          from philosophers, poets, writers, and modern thinkers. Share how
          these words resonate with your life.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          The quotes below are now coming from your live Supabase database.
        </p>
      </section>

      {/* Feed */}
      <section>
        {quotes.length === 0 && (
          <p className="text-sm text-zinc-500">
            No quotes found yet. Add more rows in Supabase to see them here.
          </p>
        )}

        {quotes.map((q) => (
          <QuoteCard
            key={q.id}
            quoteId={q.id}
            quote={q.text}
            author={q.author}
            era={q.era ?? undefined}
            tags={q.tags ?? []}
            interpretations={(q.interpretations ?? []).map((interp) => ({
              authorName: interp.author_name || "Anonymous",
              content: interp.content,
              upvotes: interp.upvotes ?? 0,
            }))}
          />
        ))}
      </section>
    </div>
  );
}
