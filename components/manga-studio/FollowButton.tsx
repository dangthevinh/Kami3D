"use client";

import { UserPlus, UserCheck } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { errorText, mangaRequest } from "@/components/manga-studio/api";
import { cn } from "@/lib/utils";

/**
 * Follow an author.
 *
 * The API owns the truth here in both directions: `{ following }` comes back from the same call that
 * is idempotent in the database (the row is keyed by (follower, author), so a second tap cannot count
 * twice). Nothing is stored locally, and the button reports the API's sentence when it refuses.
 */

export function FollowButton({
  userId,
  initialFollowing = false,
  className,
}: {
  userId: string;
  initialFollowing?: boolean;
  className?: string;
}) {
  const [following, setFollowing] = React.useState(initialFollowing);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setFollowing((value) => !value);

    try {
      const result = await mangaRequest<{ following: boolean }>(
        "/api/manga/users/" + encodeURIComponent(userId) + "/follow",
        { method: "POST" },
      );
      setFollowing(result.following);
    } catch (caught) {
      setFollowing((value) => !value);
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Button type="button" variant="outline" size="sm" disabled={busy} aria-pressed={following} onClick={onClick}>
        {following ? <UserCheck aria-hidden /> : <UserPlus aria-hidden />}
        {following ? "Following" : "Follow"}
      </Button>
      {error ? (
        <p role="alert" className="text-[11px] leading-relaxed text-coral">
          {error}
        </p>
      ) : null}
    </div>
  );
}
