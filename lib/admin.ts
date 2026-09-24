import { getCurrentUserId } from "@/lib/auth";
import { getPersonalDataClient } from "@/lib/personal-data";

/**
 * The admin gate, in one place.
 *
 * Every /admin page and /api/admin route asks the same two questions: is anybody signed in, and does
 * the database consider them an admin? The answer comes from \`public.is_admin()\` rather than from a
 * list in the code, so the allow-list lives in one row of \`app_admins\` and adding an admin is a SQL
 * statement rather than a deploy.
 *
 * \`checked\` is the honest third answer: when the database cannot be reached we do not know, and a
 * caller that shows an error must not pretend it does.
 */
export interface AdminStatus {
  signedIn: boolean;
  admin: boolean;
  checked: boolean;
  userId: string | null;
}

export async function adminStatus(): Promise<AdminStatus> {
  const userId = await getCurrentUserId();
  if (!userId) return { signedIn: false, admin: false, checked: true, userId: null };

  const supabase = await getPersonalDataClient();
  if (!supabase) return { signedIn: true, admin: false, checked: false, userId };

  const { data, error } = await supabase.rpc("is_admin");
  if (error) return { signedIn: true, admin: false, checked: false, userId };
  return { signedIn: true, admin: data === true, checked: true, userId };
}
