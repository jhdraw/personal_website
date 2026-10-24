import { NextResponse } from "next/server";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { supabaseServer } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { r2Client, r2Configured, R2_BUCKET } from "@/lib/r2";

export const dynamic = "force-dynamic";

// Only the owner may obtain upload/delete access to R2. Reads of public files
// don't go through here (they use the public r2.dev URL directly); the presigned
// GET is only used by the admin rotate flow to read bytes back for re-encoding.
async function requireOwner() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isOwnerEmail(user?.email);
}

export async function POST(request: Request) {
  if (!r2Configured()) {
    return NextResponse.json({ error: "R2 not configured" }, { status: 500 });
  }
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== "string") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const client = r2Client();

  try {
    if (body.action === "upload") {
      const key = String(body.path ?? "");
      if (!key) return NextResponse.json({ error: "missing path" }, { status: 400 });
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          ContentType: body.contentType || undefined,
          ContentDisposition: body.contentDisposition || undefined,
        }),
        { expiresIn: 600 }
      );
      return NextResponse.json({ url, key });
    }

    if (body.action === "download") {
      const key = String(body.path ?? "");
      if (!key) return NextResponse.json({ error: "missing path" }, { status: 400 });
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
        { expiresIn: 600 }
      );
      return NextResponse.json({ url });
    }

    if (body.action === "delete") {
      const paths: string[] = Array.isArray(body.paths) ? body.paths : [];
      if (paths.length === 0) return NextResponse.json({ ok: true });
      await client.send(
        new DeleteObjectsCommand({
          Bucket: R2_BUCKET,
          Delete: { Objects: paths.map((p) => ({ Key: p })) },
        })
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "r2 error" },
      { status: 500 }
    );
  }
}
