"use client";

import { useRef, useState } from "react";
import { CV_ACCEPT, sniffCvKind, validateCvMeta } from "@/lib/cv/files";
import { cn } from "@/lib/format";
import { FieldError } from "./ui/form";
import { Icon } from "./ui/icon";

export type UploadState =
  | { state: "idle" }
  | { state: "uploading"; name: string; size: number; progress: number }
  | { state: "done"; name: string; size: number; path: string }
  | { state: "error"; message: string };

function formatBytes(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;
}

/**
 * Uploads a CV straight to private storage through a short-lived signed URL
 * obtained from `endpoint`, reporting real progress. The server re-validates the file.
 */
export function useCvUpload(endpoint: string) {
  const [upload, setUpload] = useState<UploadState>({ state: "idle" });

  const start = async (file: File) => {
    const meta = validateCvMeta(file.name, file.size);
    if (!meta.ok) return setUpload({ state: "error", message: meta.error });
    const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
    if (!sniffCvKind(head)) return setUpload({ state: "error", message: "This file does not look like a valid PDF, DOCX or DOC document." });

    setUpload({ state: "uploading", name: file.name, size: file.size, progress: 0 });
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, size: file.size }) });
      const body = (await res.json()) as { path?: string; signedUrl?: string; error?: string };
      if (!res.ok || !body.signedUrl || !body.path) throw new Error(body.error ?? "Upload could not be started.");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", body.signedUrl!);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.setRequestHeader("x-upsert", "false");
        xhr.upload.onprogress = (e) => e.lengthComputable && setUpload({ state: "uploading", name: file.name, size: file.size, progress: Math.round((e.loaded / e.total) * 100) });
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("The upload was rejected. Please check the file and try again.")));
        xhr.onerror = () => reject(new Error("Network error during upload. Please try again."));
        xhr.send(file);
      });
      setUpload({ state: "done", name: file.name, size: file.size, path: body.path });
    } catch (err) {
      setUpload({ state: "error", message: err instanceof Error ? err.message : "Upload failed." });
    }
  };

  return { upload, start, reset: () => setUpload({ state: "idle" }) };
}

export function CvDropzone({ upload, onFile, onRemove, errors }: { upload: UploadState; onFile: (f: File) => void; onRemove: () => void; errors?: string[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  return (
    <div>
      <input type="hidden" name="upload_path" value={upload.state === "done" ? upload.path : ""} />
      <input type="hidden" name="original_filename" value={upload.state === "done" ? upload.name : ""} />
      <input
        ref={fileRef}
        id="cv-file"
        type="file"
        accept={CV_ACCEPT}
        className="sr-only"
        aria-label="Choose CV file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={cn("rounded-xl border-2 border-dashed p-space-2xl text-center transition-colors", dragOver ? "border-primary-container bg-secondary-fixed/10" : "border-border-subtle bg-surface-container-low/50")}
      >
        <span className="mx-auto mb-space-sm h-12 w-12 rounded-full bg-surface-container-lowest shadow-sm grid place-items-center text-primary"><Icon name="cloud_upload" /></span>
        <p className="font-label-md text-label-md text-text-primary">
          Drop your CV here or{" "}
          <button type="button" className="text-primary underline" onClick={() => fileRef.current?.click()}>browse files</button>
        </p>
        <p className="font-body-sm text-body-sm text-text-muted mt-1">Supported formats: PDF, DOCX, DOC • Maximum file size 10 MB</p>
      </div>
      {upload.state === "uploading" && (
        <div className="mt-space-md rounded-lg border border-border-subtle p-space-md" aria-live="polite">
          <div className="flex justify-between font-body-sm text-body-sm"><span className="truncate">{upload.name}</span><span>{upload.progress}%</span></div>
          <div className="h-1.5 mt-2 rounded-full bg-surface-container-high overflow-hidden" role="progressbar" aria-label="Upload progress" aria-valuenow={upload.progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-primary-container transition-all" style={{ width: `${upload.progress}%` }} />
          </div>
        </div>
      )}
      {upload.state === "done" && (
        <div className="mt-space-md rounded-lg border border-border-subtle p-space-md flex items-center gap-space-sm" aria-live="polite">
          <span className="h-10 w-10 rounded-lg bg-primary-container text-on-primary grid place-items-center"><Icon name="description" /></span>
          <div className="flex-1 min-w-0">
            <div className="font-label-md text-label-md truncate">{upload.name}</div>
            <div className="font-body-sm text-body-sm text-text-muted">{formatBytes(upload.size)} • Uploaded securely</div>
          </div>
          <span className="chip-green"><Icon name="check_circle" className="text-sm" /> Ready</span>
          <button type="button" className="h-9 w-9 grid place-items-center rounded-full hover:bg-surface-container-high" aria-label="Remove file" onClick={onRemove}>
            <Icon name="delete" className="text-lg" />
          </button>
        </div>
      )}
      {upload.state === "error" && <p className="tv-error" role="alert">{upload.message}</p>}
      <FieldError errors={errors} />
    </div>
  );
}
