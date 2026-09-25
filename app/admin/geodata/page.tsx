import type { Metadata } from "next";
import Link from "next/link";

import { GeodataUploadForm } from "@/components/admin/GeodataUploadForm";
import { getAllAnimals } from "@/lib/animals";
import { adminStatus } from "@/lib/admin";
import { getPersonalDataClient } from "@/lib/personal-data";

/**
 * `/admin/geodata` — the curated import path.
 *
 * The gate is a row in `public.app_admins`, checked in Postgres by `is_admin()` and again
 * here, and enforced a third time by the RLS policy on `animal_geodata`. That is real
 * authorisation rather than an environment variable, which the phase brief explicitly said
 * would be a lie dressed as security.
 *
 * With `app_admins` empty — which is how a fresh clone arrives — nobody is an admin, and the
 * page explains how to add one instead of showing a form that cannot work.
 */

export const metadata: Metadata = {
  title: "Geodata admin",
  description: "Import curated range, threat and observation geodata into Kami3D.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";


export default async function AdminGeodataPage() {
  const status = await adminStatus();

  if (!status.admin) {
    return (
      <div className="section-shell py-14">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white">Geodata admin</h1>
        <div className="glass mt-5 max-w-2xl rounded-[var(--radius-card)] p-5 text-sm leading-relaxed text-white/60">
          {status.signedIn ? (
            <p>
              This account is not an admin. Access is a row in <code className="text-white/80">public.app_admins</code>,
              checked by <code className="text-white/80">public.is_admin()</code> and enforced again by the row level
              security policy on the data itself.
            </p>
          ) : (
            <p>
              Sign in first. Being an admin is a row in the database, not a flag on a page:
              without one, this form would be a lie.
            </p>
          )}

          <p className="mt-3">To grant access, run this with the service role — there is no UI for it on purpose:</p>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-void/60 p-3 text-[11px] text-white/70">
            {`insert into public.app_admins (user_id, note)
values ('<your user id>', 'maintainer');`}
          </pre>
          <p className="mt-3 text-xs text-white/40">
            The CLI does the same job without an account:
            <code className="ml-1 text-white/60">npm run geodata:report -- --file=… --apply</code>.
          </p>
        </div>

        <Link href="/map" className="mt-5 inline-block text-xs text-neon hover:text-white">
          ← Back to the map
        </Link>
      </div>
    );
  }

  const animals = await getAllAnimals();

  return (
    <div className="section-shell py-10">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-solar">Admin</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">Geodata import</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
          Paste a GeoJSON file or a CSV with coordinates, check the preview, then publish. The
          checks are the ones the CLI runs, and the row level security policy is the same one the
          database enforces — this page adds a preview, not a second set of rules.
        </p>
      </header>

      <div className="mt-6">
        <GeodataUploadForm species={animals.map((animal) => ({ slug: animal.slug, name: animal.name }))} />
      </div>
    </div>
  );
}
