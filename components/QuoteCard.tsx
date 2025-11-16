"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type Interpretation = {
  id: string;
  authorName: string;
  content: string;
  upvotes: number;
  authorAvatarUrl?: string | null;
  authorUserId?: string | null;
};

type QuoteCardProps = {
  quoteId: string;
  quote: string;
  author: string;
  era?: string;
  tags: string[];
  interpretations: Interpretation[];
};

const QuoteCard: React.FC<QuoteCardProps> = ({
  quoteId,
  quote,
  author,
  era,
  tags,
  interpretations,
}) => {
  const [localInterpretations, setLocalInterpretations] = useState<
    Interpretation[]
  >(interpretations);

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upvotingId, setUpvotingId] = useState<string | null>(null);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Helper: get current user, but don't console-error for missing session
  const getCurrentUser = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error && error.message !== "Auth session missing!") {
      console.error("Error checking user", error.message);
      return null;
    }

    return data?.user ?? null;
  };

  // On mount: load user info + which interpretations they already upvoted
  useEffect(() => {
    const initUserState = async () => {
      const user = await getCurrentUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const meta = user.user_metadata as any;

      const fullName =
        (meta?.full_name as string | undefined) ??
        (meta?.name as string | undefined);

      const email = user.email ?? "";
      const fallbackFromEmail = email ? email.split("@")[0] : null;

      const displayName = fullName || fallbackFromEmail || null;
      const avatar = (meta?.picture as string | undefined) ?? null;

      if (displayName) {
        setUserDisplayName(displayName);
        setName((prev) => (prev.trim().length === 0 ? displayName : prev));
      }

      if (avatar) {
        setUserAvatarUrl(avatar);
      }

      const { data, error } = await supabase
        .from("interpretation_upvotes")
        .select("interpretation_id")
        .eq("user_id", user.id);

      if (!error && data) {
        setUserUpvotes(new Set(data.map((d) => d.interpretation_id)));
      }
    };

    initUserState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add a new interpretation (auth required)
  const handleAddInterpretation = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedContent = content.trim();
    const trimmedName = name.trim();

    if (!trimmedContent) return;

    const user = await getCurrentUser();
    if (!user) {
      alert("Please sign in with Google to add an interpretation.");
      return;
    }

    const effectiveName = trimmedName || userDisplayName || null;
    const effectiveAvatar = userAvatarUrl || null;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("interpretations")
        .insert({
          quote_id: quoteId,
          user_id: user.id,
          author_name: effectiveName,
          author_avatar_url: effectiveAvatar,
          content: trimmedContent,
          upvotes: 0,
        })
        .select("id, author_name, author_avatar_url, content, upvotes, user_id")
        .single();

      if (error) {
        console.error("Error adding interpretation", error.message);
        return;
      }

      if (!data) return;

      const newInterp: Interpretation = {
        id: data.id,
        authorName: data.author_name ?? "Anonymous",
        content: data.content,
        upvotes: data.upvotes ?? 0,
        authorAvatarUrl: data.author_avatar_url ?? null,
        authorUserId: data.user_id ?? null,
      };

      setLocalInterpretations((prev) => [newInterp, ...prev]);
      setContent("");
      // keep name as the identity
    } catch (err) {
      console.error("Error adding interpretation", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upvote toggle (like YouTube): click = like, click again = unlike
  const handleUpvote = async (id: string) => {
    const user = await getCurrentUser();
    if (!user) return;

    const target = localInterpretations.find((i) => i.id === id);
    if (!target) return;

    const alreadyLiked = userUpvotes.has(id);
    const currentUpvotes = target.upvotes;

    const updatedCount = alreadyLiked
      ? Math.max(currentUpvotes - 1, 0)
      : currentUpvotes + 1;

    // Optimistic UI update for count
    setLocalInterpretations((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, upvotes: updatedCount } : i
      )
    );

    // Optimistic UI update for liked-state
    setUserUpvotes((prev) => {
      const copy = new Set(prev);
      if (alreadyLiked) {
        copy.delete(id);
      } else {
        copy.add(id);
      }
      return copy;
    });

    setUpvotingId(id);

    try {
      if (alreadyLiked) {
        const { error: removeError } = await supabase
          .from("interpretation_upvotes")
          .delete()
          .eq("user_id", user.id)
          .eq("interpretation_id", id);

        if (removeError) {
          console.error("Error removing upvote", removeError.message);
          // revert
          setLocalInterpretations((prev) =>
            prev.map((i) =>
              i.id === id ? { ...i, upvotes: currentUpvotes } : i
            )
          );
          setUserUpvotes((prev) => {
            const copy = new Set(prev);
            copy.add(id);
            return copy;
          });
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from("interpretation_upvotes")
          .insert({
            user_id: user.id,
            interpretation_id: id,
          });

        if (insertError) {
          console.error("Error adding upvote", insertError.message);
          // revert
          setLocalInterpretations((prev) =>
            prev.map((i) =>
              i.id === id ? { ...i, upvotes: currentUpvotes } : i
            )
          );
          setUserUpvotes((prev) => {
            const copy = new Set(prev);
            copy.delete(id);
            return copy;
          });
          return;
        }
      }

      await supabase
        .from("interpretations")
        .update({ upvotes: updatedCount })
        .eq("id", id);
    } catch (err) {
      console.error("Upvote error", err);
      // Revert on any unexpected error
      setLocalInterpretations((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, upvotes: currentUpvotes } : i
        )
      );
      setUserUpvotes((prev) => {
        const copy = new Set(prev);
        if (alreadyLiked) {
          copy.add(id);
        } else {
          copy.delete(id);
        }
        return copy;
      });
    } finally {
      setUpvotingId(null);
    }
  };

  // Delete an interpretation (only by its author)
  const handleDelete = async (id: string) => {
    const user = await getCurrentUser();
    if (!user) return;

    const target = localInterpretations.find((i) => i.id === id);
    if (!target) return;

    // Only allow if this interpretation belongs to current user
    if (target.authorUserId && target.authorUserId !== user.id) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this interpretation? This cannot be undone."
    );
    if (!confirmed) return;

    const previous = localInterpretations;

    // Optimistic remove from UI
    setLocalInterpretations((prev) => prev.filter((i) => i.id !== id));

    try {
      const { error } = await supabase
        .from("interpretations")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting interpretation", error.message);
        // revert list
        setLocalInterpretations(previous);
      } else {
        // Also cleanup liked set (if this user had liked their own)
        setUserUpvotes((prev) => {
          const copy = new Set(prev);
          copy.delete(id);
          return copy;
        });
      }
    } catch (err) {
      console.error("Error deleting interpretation", err);
      setLocalInterpretations(previous);
    }
  };

  const renderAvatar = (interp: Interpretation) => {
    const url = interp.authorAvatarUrl;
    const fallbackInitial =
      interp.authorName?.trim()?.charAt(0)?.toUpperCase() ?? "?";

    if (url) {
      return (
        <img
          src={url}
          alt={interp.authorName || "User avatar"}
          className="h-6 w-6 rounded-full object-cover"
        />
      );
    }

    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-semibold text-zinc-100">
        {fallbackInitial}
      </div>
    );
  };

  return (
    <article className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-sm">
      {/* Quote */}
      <header className="mb-3">
        <p className="text-sm italic text-zinc-100">“{quote}”</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span>— {author}</span>
          {era && <span className="text-zinc-500">· {era}</span>}
          {tags.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] uppercase tracking-wide text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </span>
          )}
        </div>
      </header>

      {/* Add interpretation */}
      <form onSubmit={handleAddInterpretation} className="mb-3 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-1/3 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-zinc-500"
          />
          <textarea
            placeholder="How do you interpret this quote?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="flex-1 resize-none rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-zinc-500"
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span>
            {userDisplayName
              ? `Posting as ${userDisplayName}. Be kind and thoughtful.`
              : "Share your own meaning. Be kind and thoughtful."}
          </span>
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>

      {/* Interpretations list */}
      <section className="space-y-2">
        {localInterpretations.length === 0 ? (
          <p className="text-xs text-zinc-500">
            No interpretations yet. Be the first to add one.
          </p>
        ) : (
          localInterpretations.map((interp) => (
            <div
              key={interp.id}
              className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {renderAvatar(interp)}
                  <span className="font-medium text-zinc-200">
                    {interp.authorName || "Anonymous"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpvote(interp.id)}
                    disabled={upvotingId === interp.id}
                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition ${
                      userUpvotes.has(interp.id)
                        ? "border-zinc-300 text-zinc-100 bg-zinc-800"
                        : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-900"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <span>{userUpvotes.has(interp.id) ? "▲" : "△"}</span>
                    <span>{interp.upvotes}</span>
                  </button>

                  {currentUserId && (() => {
                    const ownsById =
                      interp.authorUserId && interp.authorUserId === currentUserId;
                    const ownsByName =
                      !interp.authorUserId &&
                      interp.authorName &&
                      userDisplayName &&
                      interp.authorName === userDisplayName;

                     const canDelete = ownsById || ownsByName;

                     if (!canDelete) return null;

                     return (
                       <button
                         type="button"
                         onClick={() => handleDelete(interp.id)}
                         className="text-[10px] text-zinc-500 hover:text-red-400"
                       >
                         Delete
                       </button>
                     );
                   })()}

                </div>
              </div>
              <p className="mt-1 text-zinc-300">{interp.content}</p>
            </div>
          ))
        )}
      </section>

      {/* Optional footer */}
      <footer className="mt-3 flex gap-2 text-[11px]">
        <button
          type="button"
          className="rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-900"
        >
          Save
        </button>
        <button
          type="button"
          className="rounded-full border border-zinc-800 px-2 py-0.5 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
        >
          Share
        </button>
      </footer>
    </article>
  );
};

export default QuoteCard;
