import  QuoteCard  from "../components/QuoteCard";
import { supabase } from "../lib/supabaseClient";

type DbInterpretation = {
  id: string;
  author_name: string | null;
  content: string;
  upvotes: number | null;
  author_avatar_url: string | null;
};

type DbQuoteRow = {
  id: string;
  text: string;
  author: string;
  era: string | null;
  tags: string[] | null;
  interpretations: DbInterpretation[] | null;
};

async function getQuotes(): Promise<{ quotes: DbQuoteRow[]; hasError: boolean }> {
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
          upvotes,
          author_avatar_url
        )
      `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading quotes:", error.message);
    return { quotes: [], hasError: true };
  }

  return { quotes: (data ?? []) as DbQuoteRow[], hasError: false };
}

export default async function Home() {
  const { quotes, hasError } = await getQuotes();

  return (
    <div className="space-y-6">
      {/* Intro */}
      <section className="mb-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Decode quotes together.
        </h2>
        <p className="mt-2 text-sm text-zinc-300">
          Welcome to QuotesDecode — a community where people interpret quotes
          from philosophers, poets, writers, and modern thinkers. Share how
          these words resonate with your life.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          The quotes below are coming from your live Supabase database.
        </p>
      </section>

      {/* States */}
      {hasError && (
        <p className="text-sm text-red-400">
          Something went wrong while loading quotes. Please try again in a bit.
        </p>
      )}

      {/* Feed */}
      <section className="space-y-4">
        {!hasError && quotes.length === 0 && (
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
            interpretations={
              q.interpretations?.map((interp) => ({
                id: interp.id,
                authorName: interp.author_name || "Anonymous",
                content: interp.content,
                upvotes: interp.upvotes ?? 0,
                authorAvatarUrl: interp.author_avatar_url ?? null,
              })) ?? []
            }
          />
        ))}
      </section>
    </div>
  );
}
