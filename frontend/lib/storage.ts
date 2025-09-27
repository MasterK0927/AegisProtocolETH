"use client";

export type AgentAttachment = {
  name: string;
  path: string;
  mimeType?: string;
  size?: number;
};

export type AgentMetadataPayload = {
  name: string;
  description: string;
  shortDescription?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: unknown }>;
  aegis: {
    name: string;
    shortDescription?: string;
    description?: string;
    category?: string;
    tools?: string[];
    capabilities?: string[];
    context?: string;
    hourlyRate: number;
    outputs?: string[];
    llmConfig?: {
      provider: string;
      model: string;
      temperature?: number;
      maxTokens?: number;
    };
    createdBy: string;
    createdAt: string;
  };
};

export type UploadMetadataResponse = {
  cid: string;
  uri: string;
  attachments: AgentAttachment[];
};

export async function uploadAgentMetadata(
  payload: AgentMetadataPayload,
  files: File[]
): Promise<UploadMetadataResponse> {
  const formData = new FormData();
  formData.append("metadata", JSON.stringify(payload));

  for (const file of files) {
    formData.append("files", file, file.name);
  }

  const response = await fetch("/api/storage/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = "Failed to upload metadata to Filecoin.";
    try {
      const errorBody = (await response.json()) as { error?: string };
      if (errorBody?.error) {
        errorMessage = errorBody.error;
      }
    } catch {
      // ignore JSON parsing errors
    }
    throw new Error(errorMessage);
  }

  const result = (await response.json()) as UploadMetadataResponse;
  return result;
}
