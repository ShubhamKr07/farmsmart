import { customFetch } from "@workspace/api-client-react";

export async function uploadPhoto(localUri: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", {
    uri: localUri,
    type: "image/jpeg",
    name: "photo.jpg",
  } as any);

  const { url } = await customFetch<{ url: string }>("/api/media/upload", {
    method: "POST",
    body: formData as any,
  });

  return url;
}
