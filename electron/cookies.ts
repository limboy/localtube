import { safeStorage, session } from "electron";
import { appGet, appSet } from "./store";

const KEY = "youtubeCookie";
// Marks a value as ciphertext. Cookies saved before safeStorage was available
// (or on a machine whose keychain is locked) stay readable as plain text.
const ENCRYPTED_PREFIX = "enc:";

function canEncrypt(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

/**
 * The YouTube cookie header, in plain text. These cookies carry full account
 * access, so they live encrypted on disk whenever the OS keychain will have
 * them.
 */
export function getYoutubeCookie(): string {
  const stored = appGet<string>(KEY);
  if (!stored) return "";
  if (!stored.startsWith(ENCRYPTED_PREFIX)) return stored;

  const cookie = decrypt(stored);
  if (cookie) return cookie;

  // The key safeStorage hands out is not guaranteed to survive across runs —
  // in development every Electron app shares one keychain entry, and losing it
  // leaves ciphertext nothing can read. Drop the dead value rather than let the
  // UI keep reporting a saved cookie while every request goes out anonymous.
  appSet(KEY, "");
  return "";
}

function decrypt(stored: string): string {
  if (!canEncrypt()) return "";
  try {
    return safeStorage.decryptString(
      Buffer.from(stored.slice(ENCRYPTED_PREFIX.length), "base64")
    );
  } catch {
    return "";
  }
}

export function setYoutubeCookie(value: string) {
  const cookie = value.trim();
  if (!cookie) {
    appSet(KEY, "");
    return;
  }

  const encrypted = encrypt(cookie);
  // Storing ciphertext this machine cannot read back would lose the cookie
  // silently, so keep it only once a round trip proves it survives.
  appSet(KEY, encrypted && decrypt(encrypted) === cookie ? encrypted : cookie);
}

function encrypt(cookie: string): string {
  if (!canEncrypt()) return "";
  try {
    return `${ENCRYPTED_PREFIX}${safeStorage.encryptString(cookie).toString("base64")}`;
  } catch {
    return "";
  }
}

const CREDENTIALED_HOSTS = [
  "youtube.com",
  "youtubei.googleapis.com",
  "googlevideo.com",
  "google.com",
];

/**
 * Whether a URL may receive the signed-in headers. Every request the renderer
 * makes goes through one main-process handler, so without this check a
 * thumbnail host — or anything else a feed happens to name — could be handed
 * the account cookie.
 */
export function acceptsCredentials(url: string): boolean {
  let host: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    host = parsed.hostname.toLowerCase();
  } catch {
    return false;
  }

  return CREDENTIALED_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

const CREDENTIAL_HEADERS = ["cookie", "authorization", "x-goog-authuser", "x-goog-pageid"];

export function stripCredentialHeaders(
  headers: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!headers) return headers;
  const safe: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (CREDENTIAL_HEADERS.includes(name.toLowerCase())) continue;
    safe[name] = value;
  }
  return safe;
}

export function hasCookieHeader(headers: Record<string, string> | undefined): boolean {
  if (!headers) return false;
  return Object.keys(headers).some((name) => name.toLowerCase() === "cookie");
}

const YOUTUBE_URL = "https://www.youtube.com";
const YOUTUBE_DOMAIN = ".youtube.com";

function parsePairs(cookie: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const part of cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name && value) pairs.push([name, value]);
  }
  return pairs;
}

/**
 * Puts the cookie in the session the embedded player runs in. Signing the
 * InnerTube requests is not enough on its own: playback happens inside an
 * iframe that carries only the session's own anonymous visitor cookies, and
 * YouTube answers those with "Sign in to confirm you're not a bot".
 *
 * The iframe is a cross-site context, so the cookies have to be SameSite=None
 * (`no_restriction`) or the browser withholds them from the embed.
 */
export async function syncSessionCookies(cookie: string) {
  const jar = session.defaultSession.cookies;

  // Clear first so switching accounts cannot leave half of the old one behind.
  for (const existing of await jar.get({ domain: "youtube.com" })) {
    const host = (existing.domain ?? YOUTUBE_DOMAIN).replace(/^\./, "");
    try {
      await jar.remove(`https://${host}${existing.path ?? "/"}`, existing.name);
    } catch {
      // A cookie we cannot address is one we cannot have set; leave it.
    }
  }

  if (!cookie) return;

  const expirationDate = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
  for (const [name, value] of parsePairs(cookie)) {
    try {
      await jar.set({
        url: YOUTUBE_URL,
        name,
        value,
        domain: YOUTUBE_DOMAIN,
        path: "/",
        secure: true,
        sameSite: "no_restriction",
        expirationDate,
      });
    } catch {
      // One rejected cookie should not cost us the rest of the set.
    }
  }
}

/**
 * Restores a saved cookie into the session at startup. Does nothing when none
 * is saved, so an anonymous install keeps the visitor cookies the player builds
 * up on its own.
 */
export async function restoreSessionCookies() {
  const cookie = getYoutubeCookie();
  if (cookie) await syncSessionCookies(cookie);
}
