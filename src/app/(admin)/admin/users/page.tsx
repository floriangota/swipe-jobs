import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { listUsers } from "@/features/admin/service/users.service";
import { UserTable } from "@/features/admin/components/user-table";
import { ErrorState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Users · Admin · SwipeJobs" };

export default async function AdminUsersPage() {
  const admin = await requireRole("admin");
  let users: Awaited<ReturnType<typeof listUsers>>;
  try {
    users = await listUsers();
  } catch {
    return <ErrorState title="Couldn't load users" description="Please try again." />;
  }
  return <UserTable initial={users} currentUserId={admin.id} />;
}
