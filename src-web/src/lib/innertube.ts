import { Innertube } from "youtubei.js";
import { fetchViaMain } from "./bridge";

let instance: Promise<Innertube> | null = null;

const proxiedFetch: typeof fetch = async (input, init) => {
  let url: string;
  let method = init?.method ?? "GET";
  let headers: Record<string, string> = {};
  let body: string | undefined;

  if (input instanceof Request) {
    url = input.url;
    method = init?.method ?? input.method;
    input.headers.forEach((value, key) => {
      headers[key] = value;
    });
    if (!init?.body && input.body) {
      body = await input.clone().text();
    }
  } else {
    url = input instanceof URL ? input.toString() : input;
  }

  if (init?.headers) {
    const h =
      init.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : Array.isArray(init.headers)
          ? Object.fromEntries(init.headers)
          : (init.headers as Record<string, string>);
    headers = { ...headers, ...h };
  }

  if (init?.body !== undefined && init.body !== null) {
    body = await normalizeBody(init.body);
  }

  const result = await fetchViaMain(url, { method, headers, body });
  const payload = await result.text();

  return new Response(payload, {
    status: result.status,
    statusText: result.statusText,
    headers: result.headers,
  });
};

async function normalizeBody(body: BodyInit): Promise<string> {
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
  if (ArrayBuffer.isView(body)) return new TextDecoder().decode(body as Uint8Array);
  if (body instanceof Blob) return await body.text();
  if (body instanceof FormData) {
    const params = new URLSearchParams();
    body.forEach((value, key) => params.append(key, value as string));
    return params.toString();
  }
  if (body instanceof ReadableStream) {
    return await new Response(body).text();
  }
  return String(body);
}

export function getInnertube(): Promise<Innertube> {
  if (!instance) {
    instance = Innertube.create({
      fetch: proxiedFetch,
      generate_session_locally: true,
      retrieve_player: false,
    });
  }
  return instance;
}
