import "server-only";
import type { AppUser } from "@/lib/auth/guards";
import { getOwnEmployerProfile } from "./employer-profile.service";
import { getOwnWorkerProfile } from "./worker-profile.service";

/** Whether the user has completed their role's profile (drives onboarding routing). */
export async function hasProfile(user: AppUser): Promise<boolean> {
  if (user.role === "worker") return (await getOwnWorkerProfile(user.id)) !== null;
  if (user.role === "employer") return (await getOwnEmployerProfile(user.id)) !== null;
  return true; // admins have no marketplace profile
}
