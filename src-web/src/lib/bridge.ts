import type { FetchInit } from "@/electron";

export async function fetchViaMain(url: string, init?: FetchInit & { signal?: AbortSignal }) {
  const { signal, ...rest } = init ?? {};
  // AbortSignal isn't serializable over IPC; fall back to timeout.
  void signal;
  const headers = rest.headers instanceof Headers
    ? Object.fromEntries(rest.headers.entries())
    : (rest.headers as Record<string, string> | undefined);
  const result = await window.electron.fetch(url, { ...rest, headers });

  return {
    ok: result.ok,
    status: result.status,
    statusText: result.statusText,
    headers: new Headers(result.headers),
    text: async () => result.body,
    json: async () => JSON.parse(result.body),
  };
}
