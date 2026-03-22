import { httpsCallable } from "firebase/functions";
import { functions } from "../firebaseConfig";

/**
 * Accepterar väntande inbjudan för inloggad användares e-post.
 * Anropas vid inloggning när användaren saknar companyId.
 *
 * @returns {Promise<{ companyId: string, companyName: string, role: string } | null>}
 */
export async function acceptInvitation() {
  const fn = httpsCallable(functions, "acceptInvitation");
  const result = await fn();
  return result.data ?? null;
}
