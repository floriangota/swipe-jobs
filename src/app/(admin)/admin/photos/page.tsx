import type { Metadata } from "next";
import { listPendingPhotos } from "@/features/admin/service/moderation.service";
import { PhotoQueue } from "@/features/admin/components/photo-queue";
import { ErrorState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Photos · Admin · SwipeJobs" };

export default async function AdminPhotosPage() {
  let photos: Awaited<ReturnType<typeof listPendingPhotos>>;
  try {
    photos = await listPendingPhotos();
  } catch {
    return <ErrorState title="Couldn't load the queue" description="Please try again." />;
  }
  return <PhotoQueue initial={photos} />;
}
