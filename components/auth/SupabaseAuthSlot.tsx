"use client";

import type { Session } from "@supabase/supabase-js";
import { ChevronDown, Heart, LogOut, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { GuestMenu } from "@/components/layout/GuestMenu";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

/**
 * Navbar auth area for the Supabase provider.
 *
 * The session is resolved **in the browser on purpose**: reading cookies in the
 * root layout would opt every route — including the 24 statically generated
 * species pages — into dynamic rendering. Instead the server renders the guest
 * state (which is also the correct state for a first-time visitor and for
 * crawlers) and this swaps in the account menu once the session is known.
 */

interface Viewer {
  id: string;
  email: string | null;
}

function initialsFor(email: string | null) {
  if (!email) return "?";
  return email.trim().charAt(0).toUpperCase();
}

function ViewerMenu({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const container = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function signOut() {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    setOpen(false);
    setSigningOut(false);
    router.push("/");
    // Re-render the Server Components so they see the cleared session.
    router.refresh();
  }

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${viewer.email ?? "your account"}`}
        className="flex items-center gap-2 rounded-full bg-white/6 py-1 pl-1 pr-2.5 ring-1 ring-white/12 transition-colors hover:bg-white/12"
      >
        <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-neon to-iris text-[12px] font-bold text-on-accent">
          {initialsFor(viewer.email)}
        </span>
        <ChevronDown className={cn("size-3.5 text-white/50 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
          <div
            role="menu"
            className="glass-strong animate-drop-in absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 overflow-hidden rounded-2xl p-1.5"
          >
            <div className="px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-white/40">Signed in as</p>
              <p className="truncate text-sm text-white/85">{viewer.email ?? "your account"}</p>
            </div>
            <div className="my-1 h-px bg-white/8" />
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/75 transition-colors hover:bg-white/8 hover:text-white"
            >
              <Heart className="size-4 text-neon" />
              My collection
            </Link>
            <Link
              href="/profile#badges"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/75 transition-colors hover:bg-white/8 hover:text-white"
            >
              <Trophy className="size-4 text-solar" />
              Badges & scores
            </Link>
            <div className="my-1 h-px bg-white/8" />
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-white/75 transition-colors hover:bg-coral/12 hover:text-coral disabled:opacity-50"
            >
              <LogOut className="size-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        ) : null}
    </div>
  );
}

export function SupabaseAuthSlot() {
  const [viewer, setViewer] = React.useState<Viewer | null>(null);
  const [resolved, setResolved] = React.useState(false);

  React.useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setResolved(true);
      return;
    }

    let active = true;

    void supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (!active) return;
      const user = data.session?.user;
      setViewer(user ? { id: user.id, email: user.email ?? null } : null);
      setResolved(true);
    });

    // Keeps the navbar in step when a sign-in or sign-out happens elsewhere.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        const user = session?.user;
        setViewer(user ? { id: user.id, email: user.email ?? null } : null);
        setResolved(true);
      },
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (viewer) return <ViewerMenu viewer={viewer} />;

  // Before the session resolves, show the guest menu rather than an empty gap:
  // the layout stays static, and a visitor who is signed out — most of them —
  // never sees a flicker.
  void resolved;
  return <GuestMenu />;
}
