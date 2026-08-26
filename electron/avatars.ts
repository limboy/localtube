import { app, net, protocol } from "electron";
import fs from "node:fs";
import path from "node:path";

// Channel avatars were stored inline as base64 data URLs, which made them by
// far the largest thing in app-data.json (~100KB each). They now live as files
// and are served through a privileged scheme so the renderer can still point an
// <img> straight at them.
export const AVATAR_SCHEME = "lt-asset";
const AVATAR_HOST = "avatar";
const URL_PREFIX = `${AVATAR_SCHEME}://${AVATAR_HOST}/`;

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function avatarDir() {
  return path.join(app.getPath("userData"), "avatars");
}

function fileNameFor(channelId: string, ext: string) {
  return `${channelId.replace(/[^\w-]/g, "")}${ext}`;
}

function filePathFor(fileName: string) {
  return path.join(avatarDir(), path.basename(fileName));
}

export function isAvatarUrl(value: string | undefined): value is string {
  return typeof value === "string" && value.startsWith(URL_PREFIX);
}

function cachedFileExists(url: string) {
  return fs.existsSync(filePathFor(url.slice(URL_PREFIX.length)));
}

function write(channelId: string, ext: string, data: Buffer): string {
  const fileName = fileNameFor(channelId, ext);
  fs.mkdirSync(avatarDir(), { recursive: true });
  fs.writeFileSync(filePathFor(fileName), data);
  return `${URL_PREFIX}${fileName}`;
}

/**
 * Returns a local URL for a channel's avatar, downloading it only when there is
 * no file backing the URL we already hold. Re-checking the file (rather than
 * trusting the stored URL) means an imported library heals itself on refresh.
 */
export async function ensureAvatar(
  channelId: string,
  remoteUrl: string | undefined,
  existing: string | undefined
): Promise<string | undefined> {
  if (isAvatarUrl(existing) && cachedFileExists(existing)) return existing;
  if (!remoteUrl) return isAvatarUrl(existing) ? undefined : existing;

  try {
    const response = await net.fetch(remoteUrl, { redirect: "follow" });
    if (!response.ok) return undefined;
    const contentType = (response.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    const ext = EXT_BY_MIME[contentType.toLowerCase()] ?? ".jpg";
    return write(channelId, ext, Buffer.from(await response.arrayBuffer()));
  } catch {
    return undefined;
  }
}

/** One-time move of inline `data:` avatars onto disk. */
export function migrateDataUrlAvatar(channelId: string, thumbnail: string): string | undefined {
  const match = thumbnail.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
  if (!match) return undefined;

  const [, mime, isBase64, payload] = match;
  const ext = EXT_BY_MIME[mime.toLowerCase()] ?? ".jpg";
  const data = isBase64
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "binary");

  try {
    return write(channelId, ext, data);
  } catch {
    return undefined;
  }
}

/** Drops avatar files for channels that are no longer in the library. */
export function pruneAvatars(referenced: Iterable<string | undefined>) {
  const keep = new Set<string>();
  for (const url of referenced) {
    if (isAvatarUrl(url)) keep.add(path.basename(url.slice(URL_PREFIX.length)));
  }

  let files: string[];
  try {
    files = fs.readdirSync(avatarDir());
  } catch {
    return;
  }

  for (const file of files) {
    if (keep.has(file)) continue;
    try {
      fs.unlinkSync(filePathFor(file));
    } catch {
      // A file we cannot remove is wasted space, not a failure worth surfacing.
    }
  }
}

export function registerAvatarScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: AVATAR_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
  ]);
}

export function handleAvatarProtocol() {
  protocol.handle(AVATAR_SCHEME, async (request) => {
    const fileName = path.basename(decodeURIComponent(new URL(request.url).pathname));
    try {
      const data = await fs.promises.readFile(filePathFor(fileName));
      return new Response(new Uint8Array(data), {
        headers: {
          "Content-Type": MIME_BY_EXT[path.extname(fileName).toLowerCase()] ?? "image/jpeg",
          "Cache-Control": "no-cache",
        },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });
}
