import { getCurrentUserEmail, getCurrentUserId } from "@/lib/auth";
import { getPersonalDataClient } from "@/lib/personal-data";

/**
 * The admin gate, in one place.
 *
 * Every /admin page and /api/admin route asks the same two questions: is anybody signed in, and is this
 * account an admin? There are two answers to the second, and they exist for different reasons:
 *
 *   1. **The database says so.** \`public.app_admins\` holds a row for the account, and
 *      \`public.is_admin()\` checks it in Postgres — by user id *or* by email, which is also what the row
 *      level security policies and the /admin middleware gate read. This is the real answer, and it is
 *      what an admin added later gets.
 *   2. **The default owner.** The project owner's email is an admin in code
 *      (\`DEFAULT_ADMIN_EMAILS\`), so a deployment works out of the box and a lost row is not a lost
 *      console. It is an email rather than an id on purpose: a Clerk id and a Supabase id look nothing
 *      alike, so an id-shaped default would be wrong for whichever provider the deployment happens to
 *      use, while the owner's address is the same either way.
 *
 * \`checked\` is the honest third answer: when the database cannot be reached we do not know, and a caller
 * that shows an error must not pretend it does. The default owner is therefore checked *after* the
 * database on the way to "yes" and *regardless* of it on the way to "no": if the RPC fails but the
 * visitor's address is on the list, they are still an admin.
 */
export interface AdminStatus {
  signedIn: boolean;
  admin: boolean;
  /** False when the admin check could not reach the database and only the code list answered. */
  checked: boolean;
  userId: string | null;
  /** Which rule said yes, for the page to be able to say why. */
  source: "database" | "default-owner" | "none";
}

/**
 * The project owner. Change this list for your own deployment; it is deliberately an email, not an id.
 *
 * It is not a secret and it is not a backdoor: it grants the console that already requires a signed-in
 * account, and every admin action is logged with the actor. What it does buy is that the console cannot
 * be locked out of a deployment by a forgotten INSERT.
 */
export const DEFAULT_ADMIN_EMAILS: readonly string[] = ["kaiovinh@gmail.com"];

/**
 * Admin emails: the default owner plus whatever the environment adds.
 *
 * \`ADMIN_EMAILS\` is the name going forward; \`DATA2MAP_ADMIN_EMAILS\` is the one Data2Map shipped with
 * first, and it is still honoured so an existing .env.local keeps working rather than silently losing
 * its admins.
 */
export function adminEmails(env: Record<string, string | undefined> = process.env): string[] {
  const extra = [env.ADMIN_EMAILS, env.DATA2MAP_ADMIN_EMAILS]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .flatMap((value) => value.split(/[,\s]+/))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set([...DEFAULT_ADMIN_EMAILS.map((email) => email.toLowerCase()), ...extra])];
}

export function isAdminEmail(email: string | null | undefined, env?: Record<string, string | undefined>): boolean {
  if (!email) return false;
  return adminEmails(env).includes(email.trim().toLowerCase());
}

export async function adminStatus(): Promise<AdminStatus> {
  const userId = await getCurrentUserId();
  if (!userId) return { signedIn: false, admin: false, checked: true, userId: null, source: "none" };

  const email = await getCurrentUserEmail();
  const ownerByDefault = isAdminEmail(email);

  const supabase = await getPersonalDataClient();
  if (!supabase) {
    // No data client: the database's opinion is unavailable, so only the code list can answer.
    return {
      signedIn: true,
      admin: ownerByDefault,
      checked: false,
      userId,
      source: ownerByDefault ? "default-owner" : "none",
    };
  }

  const { data, error } = await supabase.rpc("is_admin");
  if (error) {
    return {
      signedIn: true,
      admin: ownerByDefault,
      checked: false,
      userId,
      source: ownerByDefault ? "default-owner" : "none",
    };
  }

  if (data === true) return { signedIn: true, admin: true, checked: true, userId, source: "database" };
  if (ownerByDefault) return { signedIn: true, admin: true, checked: true, userId, source: "default-owner" };
  return { signedIn: true, admin: false, checked: true, userId, source: "none" };
}
