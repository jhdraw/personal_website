// Client-side helpers that talk to /api/r2 (owner-gated) to upload, read, and
// delete files in R2. Uploads go browser -> R2 directly via a presigned URL,
// so large files bypass Vercel's serverless body limit.

async function r2Api(body: unknown) {
  const res = await fetch("/api/r2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? `r2 request failed (${res.status})`);
  }
  return res.json();
}

export async function uploadToR2(
  file: Blob,
  path: string,
  opts?: { contentType?: string; contentDisposition?: string }
) {
  const contentType = opts?.contentType ?? (file as File).type ?? "application/octet-stream";
  const { url, key } = await r2Api({
    action: "upload",
    path,
    contentType,
    contentDisposition: opts?.contentDisposition,
  });
  const put = await fetch(url, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": contentType,
      ...(opts?.contentDisposition
        ? { "Content-Disposition": opts.contentDisposition }
        : {}),
    },
  });
  if (!put.ok) throw new Error(`upload failed (${put.status})`);
  return key as string;
}

export async function presignDownloadUrl(path: string) {
  const { url } = await r2Api({ action: "download", path });
  return url as string;
}

export async function deleteFromR2(paths: string[]) {
  await r2Api({ action: "delete", paths });
}
