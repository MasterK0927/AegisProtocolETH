import { NextRequest, NextResponse } from "next/server";

type RawAttachment = {
  originalName: string;
  sanitizedName: string;
  path: string;
  mimeType: string;
  size: number;
};

const DEFAULT_MIME_TYPE = "application/octet-stream";
const LIGHTHOUSE_UPLOAD_URL =
  "https://node.lighthouse.storage/api/v0/add?wrap-with-directory=true";

function sanitizeFilename(name: string, index: number) {
  const fallback = `attachment-${index}`;
  const trimmed = name.trim().toLowerCase();
  const safe = trimmed
    .replace(/[^a-z0-9_.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (safe.length === 0) {
    return fallback;
  }

  return safe;
}

function buildAttachmentMetadata(files: File[]): RawAttachment[] {
  return files.map((file, index) => {
    const originalName = file.name || `attachment-${index}`;
    const sanitizedName = sanitizeFilename(originalName, index);
    const mimeType = file.type || DEFAULT_MIME_TYPE;

    return {
      originalName,
      sanitizedName,
      mimeType,
      path: `files/${sanitizedName}`,
      size: file.size,
    } satisfies RawAttachment;
  });
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.LIGHTHOUSE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "LIGHTHOUSE_API_KEY is not configured. Add it to your environment to enable Filecoin uploads.",
        },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const metadataRaw = formData.get("metadata");
    if (typeof metadataRaw !== "string") {
      return NextResponse.json(
        { error: "Missing metadata payload" },
        { status: 400 }
      );
    }

    let metadataJson: Record<string, unknown>;
    try {
      metadataJson = JSON.parse(metadataRaw) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Invalid metadata JSON" },
        { status: 400 }
      );
    }

    const fileEntries = formData.getAll("files");
    const rawFiles = fileEntries.filter(
      (entry): entry is File => entry instanceof File
    );

    const attachments = buildAttachmentMetadata(rawFiles);

    const { aegis: rawAegis, ...metadataWithoutAegis } = metadataJson as {
      aegis?: Record<string, unknown>;
      [key: string]: unknown;
    };

    const existingAegis = rawAegis ?? {};

    const metadataWithAttachments = {
      ...metadataWithoutAegis,
      storage: {
        protocol: "filecoin",
        provider: "lighthouse",
        uploadedAt: new Date().toISOString(),
      },
      aegis: {
        ...existingAegis,
        attachments: attachments.map((attachment) => ({
          name: attachment.originalName,
          path: attachment.path,
          mimeType: attachment.mimeType,
          size: attachment.size,
        })),
      },
    } satisfies Record<string, unknown>;

    const metadataBlob = new Blob(
      [JSON.stringify(metadataWithAttachments, null, 2)],
      { type: "application/json" }
    );

    const uploadForm = new FormData();
    uploadForm.append("file", metadataBlob, "metadata.json");

    attachments.forEach((attachment, index) => {
      const file = rawFiles[index];
      if (!file) {
        return;
      }

      uploadForm.append("file", file, attachment.path);
    });

    const uploadResponse = await fetch(LIGHTHOUSE_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: uploadForm,
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text();
      throw new Error(
        errorBody.trim()
          ? `Lighthouse upload failed: ${errorBody.trim()}`
          : "Lighthouse upload failed"
      );
    }

    const responseText = await uploadResponse.text();
    const lines = responseText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let rootCid: string | undefined;
    let metadataCid: string | undefined;
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as { Hash?: string; Name?: string };
        if (typeof parsed.Hash !== "string" || parsed.Hash.length === 0) {
          continue;
        }

        if (!parsed.Name || parsed.Name.length === 0) {
          rootCid = parsed.Hash;
        }

        if (parsed.Name?.endsWith("metadata.json")) {
          metadataCid = parsed.Hash;
        }
      } catch {
        // Ignore malformed lines
      }
    }

    if (!rootCid) {
      rootCid = metadataCid;
    }

    if (!rootCid) {
      throw new Error("Lighthouse response did not include a CID.");
    }

    return NextResponse.json({
      cid: rootCid,
      uri: `ipfs://${rootCid}/metadata.json`,
      attachments: attachments.map((attachment) => ({
        name: attachment.originalName,
        path: attachment.path,
        mimeType: attachment.mimeType,
        size: attachment.size,
      })),
    });
  } catch (error) {
    console.error("Lighthouse upload failed", error);
    const message =
      error instanceof Error ? error.message : "Unexpected error during upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
