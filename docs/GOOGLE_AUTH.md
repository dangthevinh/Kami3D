# Enabling Google sign-in

The application side is already built: a **Continue with Google** button on `/sign-in` and `/sign-up`, and an
`/auth/callback` route that exchanges the one-time code for a session cookie.

What is left is configuration in two dashboards, because OAuth needs credentials that only the project owner can
create. Until it is done, the button renders **disabled with a link back to this page** — it never fails silently.

> Project reference for this deployment: `ztihljcpeylprcgblnpv`
> (the subdomain of `NEXT_PUBLIC_SUPABASE_URL`). Substitute yours if it differs.

---

## Step 1 — Google Cloud: OAuth consent screen

1. Open <https://console.cloud.google.com/apis/credentials> and pick (or create) a project.
2. **OAuth consent screen** → User type **External** → Create.
3. Fill in App name (`Kami3D`), User support email, and Developer contact email. Save and continue through
   Scopes and Test users — no scopes need adding; Supabase requests `openid email profile` for you.
4. While the app is in **Testing**, only accounts listed under *Test users* can sign in. Add your own Google
   address there, or press **Publish app** to allow anyone.

## Step 2 — Google Cloud: OAuth client

1. **Credentials** → **Create credentials** → **OAuth client ID**.
2. Application type: **Web application**.
3. **Authorised JavaScript origins** — the app's own origin:

   ```
   http://localhost:9000
   ```

4. **Authorised redirect URIs** — this is Supabase's callback, **not** the app's:

   ```
   https://ztihljcpeylprcgblnpv.supabase.co/auth/v1/callback
   ```

   This is the single most common mistake: Google returns to Supabase, and Supabase then returns to
   `/auth/callback` in the app. Putting the app's own URL here produces `redirect_uri_mismatch`.

5. Create, then copy the **Client ID** and **Client secret**.

## Step 3 — Supabase: enable the provider

1. Supabase dashboard → **Authentication** → **Sign In / Providers** → **Google**.
2. Toggle it on and paste the Client ID and Client secret from step 2. Save.

## Step 4 — Supabase: allow the return URL

**Authentication** → **URL Configuration** → **Redirect URLs**, add:

```
http://localhost:9000/auth/callback
```

Add the production equivalent too (`https://your-domain/auth/callback`) before deploying, and set
`NEXT_PUBLIC_SITE_URL` to match.

## Step 5 — Use it

Nothing to rebuild: provider availability is read from Supabase at request time (cached for five minutes). Reload
`/sign-in` and the button becomes active.

---

## How the flow works

```
browser            Supabase                     Google
   │  signInWithOAuth({ provider: "google" })     │
   ├──────────────────►│                          │
   │                   ├─────────────────────────►│  consent
   │                   │◄─────────────────────────┤  code
   │◄──────────────────┤  redirect ?code=…        │
   │  GET /auth/callback?code=…                   │
   │  exchangeCodeForSession(code)  ── sets the session cookie
   └─ redirect to the page the visitor wanted
```

The exchange happens in a Route Handler because that is the only place allowed to write the session cookies, and
`@supabase/ssr` is what makes those cookies visible to Server Components on the next request.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Button is greyed out | The Google provider is not enabled in Supabase (step 3). |
| `redirect_uri_mismatch` from Google | Step 2.4 has the app URL instead of the Supabase callback URL. |
| `provider is not enabled` after clicking | Enabled in Supabase but saved without the client secret, or the settings cache has not expired — wait a minute. |
| Signed in, then bounced back to `/sign-in` | The return URL is missing from step 4, so Supabase refuses to redirect to it. |
| `Access blocked: app has not completed verification` | The consent screen is in Testing and your address is not in Test users (step 1.4). |
| Works locally, fails in production | `https://your-domain/auth/callback` is not in step 4, or the production origin is missing from step 2.3. |

## Other providers

The same wiring works for GitHub, Apple, Discord and the rest: enable the provider in Supabase, and add it to the
`provider` union in `components/auth/GoogleButton.tsx` (or generalise the component over a provider list).
`lib/auth-providers.ts` already reports every provider Supabase has switched on, so the UI can decide what to
offer without hard-coding anything.
