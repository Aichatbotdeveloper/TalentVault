import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createAdminClient } from "../supabase/admin";
import { kindFromFilename, MAX_CV_BYTES, CV_TYPES, safeFilename, sniffCvKind } from "./files";

/**
 * Verifies an uploaded file in `incoming/`, then moves it to its permanent private location.
 * Returns document metadata for create_candidate_submission. Rejects and deletes invalid files.
 */
export async function finaliseUploadedCv(uploadPath: string, originalFilename: string) {
  const db = createAdminClient();
  const bucket = db.storage.from("cvs");
  const { data: blob, error } = await bucket.download(uploadPath);
  if (error || !blob) return { ok: false as const, error: "We could not find your uploaded CV. Please upload it again." };

  const buffer = Buffer.from(await blob.arrayBuffer());
  const declared = kindFromFilename(originalFilename);
  const actual = sniffCvKind(buffer.subarray(0, 4096));
  if (buffer.length === 0 || buffer.length > MAX_CV_BYTES || !actual || (declared && declared !== actual && !(declared === "doc" && actual === "docx"))) {
    await bucket.remove([uploadPath]);
    return { ok: false as const, error: "The uploaded file is not a valid PDF, DOCX or DOC document (max 10 MB)." };
  }

  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const finalPath = `documents/${randomUUID()}.${actual}`;
  const { error: moveError } = await bucket.move(uploadPath, finalPath);
  if (moveError) return { ok: false as const, error: "We could not store your CV. Please try again." };

  return {
    ok: true as const,
    document: {
      storage_path: finalPath,
      original_filename: safeFilename(originalFilename),
      mime_type: CV_TYPES[actual].mime,
      size_bytes: buffer.length,
      sha256,
    },
  };
}

export async function removeStoredCv(path: string) {
  await createAdminClient().storage.from("cvs").remove([path]);
}

export async function autoProcessEnabled() {
  const { data } = await createAdminClient().from("site_settings").select("value").eq("key", "auto_process_cvs").maybeSingle();
  return data?.value !== false;
}
