import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * OAuth / magic-link callback.
 *
 * Supabase sends the browser here after a provider (Google) has authenticated it,
 * carrying a one-time `code`. Exchanging that code for a session has to happen in
 * a Route Handler: it is the only place allowed to write the session cookies, and
 * the whole point of `@supabase/ssr` is that those cookies — not localStorage —
 * are what the Server Components read afterwards.
 */

/** Only same-site destinations, so a crafted link cannot bounce a visitor away. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  // Providers report refusals (and a disabled provider reports itself) here.
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(providerError)}`, url.origin));
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/sign-in?error=That+sign-in+link+was+missing+its+code.+Please+try+again.", url.origin),
    );
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.redirect(
      new URL("/sign-in?error=Supabase+is+not+configured+on+this+deployment.", url.origin),
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(error.message)}`, url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
