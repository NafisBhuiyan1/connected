import { handle, requireUser, type IdParams } from "@/lib/server/http";
import { ApiError, MAX_PHOTO_BYTES, uploadPhoto } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request, { params }: IdParams) => {
  const me = await requireUser();
  const { id } = await params;
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_PHOTO_BYTES + 64 * 1024) throw new ApiError(413, "Photos must be under 6 MB.");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Attach an image file.");
  const caption = String(form.get("caption") ?? "");
  const photo = await uploadPhoto(me, id, file, caption);
  return { photo: { id: photo.id, url: `/api/photos/${photo.id}` } };
});
