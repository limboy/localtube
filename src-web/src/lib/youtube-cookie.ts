import { fetchViaMain } from "./bridge";
import { getInnertube } from "./innertube";

// InnerTube signs requests with a hash of SAPISID; without it a cookie is
// still sent but the request stays anonymous, which is the case bot detection
// rejects. __Secure-3PAPISID is the same secret under the partitioned name and
// is what browsers hand out for third-party contexts.
const SAPISID_NAMES = ["SAPISID", "__Secure-3PAPISID"];

// Cookies for other Google properties ride along in an exported file and are
// no use to YouTube.
const ACCEPTED_DOMAINS = [".youtube.com", "youtube.com", ".google.com", "google.com"];

export interface ParsedCookie {
  /** Ready to use as a `Cookie` header, or "" if nothing usable was found. */
  cookie: string;
  names: string[];
  hasSapisid: boolean;
}

/**
 * Accepts either form a user can get at without tooling: the `cookie:` header
 * copied out of devtools, or the contents of a Netscape `cookies.txt` export.
 */
export function parseCookieInput(input: string): ParsedCookie {
  const text = input.trim();
  if (!text) return { cookie: "", names: [], hasSapisid: false };

  const pairs = isNetscapeFormat(text) ? parseNetscape(text) : parseHeader(text);

  // A cookies.txt export can hold the same name for several domains; the last
  // one wins, matching how a browser would narrow to the most specific jar.
  const byName = new Map<string, string>();
  for (const [name, value] of pairs) byName.set(name, value);

  const names = [...byName.keys()];
  return {
    cookie: names.map((name) => `${name}=${byName.get(name)}`).join("; "),
    names,
    hasSapisid: names.some((name) => SAPISID_NAMES.includes(name)),
  };
}

function isNetscapeFormat(text: string): boolean {
  return text.split("\n").some((line) => line.split("\t").length >= 7);
}

function parseNetscape(text: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];

  for (const line of text.split("\n")) {
    // "#HttpOnly_" is a real entry; every other "#" line is a comment.
    const trimmed = line.trim().replace(/^#HttpOnly_/, "");
    if (!trimmed || trimmed.startsWith("#")) continue;

    const fields = trimmed.split("\t");
    if (fields.length < 7) continue;

    const domain = fields[0].toLowerCase();
    if (!ACCEPTED_DOMAINS.includes(domain)) continue;

    const name = fields[5].trim();
    const value = fields[6].trim();
    if (name && value) pairs.push([name, value]);
  }

  return pairs;
}

function parseHeader(text: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];

  for (const part of text.replace(/^cookie:\s*/i, "").split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;

    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name && value) pairs.push([name, value]);
  }

  return pairs;
}

export interface VerifyResult {
  /** Whether YouTube treated the request as coming from a signed-in account. */
  signedIn: boolean;
  accountName?: string;
  /** Why the check failed, in YouTube's own words where there are any. */
  detail?: string;
}

/**
 * Confirms YouTube honours the stored cookie. Uses the same signed WEB request
 * the rest of the app makes rather than `account.getInfo()`, whose TV client
 * expects an OAuth token and rejects cookie auth even when the cookie is good.
 */
export async function verifySignedIn(cookie: string): Promise<VerifyResult> {
  // A cookie that does not survive the round trip to disk leaves every request
  // anonymous, which from the outside looks the same as an expired one.
  if ((await window.electron.youtubeCookie.get()) !== cookie) {
    return { signedIn: false, detail: "the cookie could not be read back after saving" };
  }

  let detail: string | undefined;

  try {
    const yt = await getInnertube();
    const response = await yt.actions.execute("/account/account_menu", { parse: false });
    const accountName = readAccountName(response.data);
    if (accountName) return { signedIn: true, accountName };
  } catch (error) {
    detail = describeError(error);
  }

  // A plain youtube.com load reflects the cookie alone, with no request signing
  // involved, so it separates an expired cookie from a signing problem.
  if (await pageSaysSignedIn(cookie)) return { signedIn: true };

  return { signedIn: false, detail: detail ?? "YouTube answered as if signed out" };
}

async function pageSaysSignedIn(cookie: string): Promise<boolean> {
  try {
    const response = await fetchViaMain("https://www.youtube.com/", {
      headers: { Cookie: cookie },
    });
    return response.ok && /"LOGGED_IN"\s*:\s*true/.test(await response.text());
  } catch {
    return false;
  }
}

function readAccountName(data: unknown): string | undefined {
  const header = (data as any)?.actions?.[0]?.openPopupAction?.popup?.multiPageMenuRenderer?.header
    ?.activeAccountHeaderRenderer?.accountName;
  const name = header?.simpleText ?? header?.runs?.[0]?.text;
  return typeof name === "string" && name.trim() ? name.trim() : undefined;
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 300 ? `${message.slice(0, 300)}…` : message;
}
