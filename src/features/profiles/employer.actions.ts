"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { employerProfileSchema, type EmployerProfileInput } from "./schemas";
import {
  createEmployerProfile,
  getOwnEmployerProfile,
  updateEmployerProfile,
} from "./service/employer-profile.service";
import type { ProfileFormState } from "./worker.actions";

/** Create or update the current employer's profile. Redirects to /profile on success. */
export async function saveEmployerProfile(input: EmployerProfileInput): Promise<ProfileFormState> {
  const user = await requireUser();
  if (user.role !== "employer") return { error: "wrong_role" };

  const parsed = employerProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const existing = await getOwnEmployerProfile(user.id);
    if (existing) await updateEmployerProfile(user.id, parsed.data);
    else await createEmployerProfile(user.id, parsed.data);
  } catch {
    return { error: "save_failed" };
  }

  revalidatePath("/", "layout");
  redirect("/profile");
}
