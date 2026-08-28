import { useEffect, useState } from "react";
import { Loader } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { resetInnertube } from "@/lib/innertube";
import { parseCookieInput, verifySignedIn } from "@/lib/youtube-cookie";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Status =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string };

export default function YoutubeCookieDialog({ open, onOpenChange }: Props) {
  const [input, setInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (!open) return;
    setInput("");
    setStatus({ kind: "idle" });
    // The stored cookie is a credential; report only that one exists rather
    // than painting it back into the textarea.
    window.electron.youtubeCookie.get().then((cookie) => setSaved(!!cookie));
  }, [open]);

  const save = async () => {
    const parsed = parseCookieInput(input);

    if (!parsed.cookie) {
      setStatus({ kind: "error", message: "No cookies found in that text." });
      return;
    }
    if (!parsed.hasSapisid) {
      setStatus({
        kind: "error",
        message:
          "Missing SAPISID — the cookie has to come from a signed-in youtube.com tab, including its secure cookies.",
      });
      return;
    }

    setStatus({ kind: "busy" });
    await window.electron.youtubeCookie.set(parsed.cookie);
    resetInnertube();

    const result = await verifySignedIn(parsed.cookie);

    if (result.signedIn) {
      setSaved(true);
      setInput("");
      setStatus({
        kind: "ok",
        message: result.accountName
          ? `Signed in as ${result.accountName}.`
          : "Cookie accepted by YouTube.",
      });
      return;
    }

    setSaved(true);
    setInput("");
    setStatus({
      kind: "error",
      message: `Saved, but YouTube did not accept it${
        result.detail ? ` — ${result.detail}` : ""
      }. If it is expired, sign in again and re-copy.`,
    });
  };

  const clear = async () => {
    await window.electron.youtubeCookie.set("");
    resetInnertube();
    setSaved(false);
    setInput("");
    setStatus({ kind: "ok", message: "Cookie removed. Requests and playback are anonymous again." });
  };

  const busy = status.kind === "busy";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-foreground">YouTube Cookie</DialogTitle>
          <DialogDescription>
            Signs both the library requests and the video player as your account, so YouTube stops
            treating LocalTube as a bot. Paste the <code>cookie</code> header from a signed-in
            youtube.com request, or the contents of a cookies.txt export.
          </DialogDescription>
        </DialogHeader>

        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setStatus({ kind: "idle" });
          }}
          disabled={busy}
          spellCheck={false}
          rows={6}
          placeholder={saved ? "Paste a new cookie to replace the saved one" : "SID=...; SAPISID=...; ..."}
          className="w-full resize-none rounded-md border border-input bg-muted px-3 py-2 font-mono text-xs text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />

        <div className="flex items-center justify-between gap-3">
          <div className="min-h-5 text-sm">
            {status.kind === "error" && <span className="text-red-500">{status.message}</span>}
            {status.kind === "ok" && <span className="text-muted-foreground">{status.message}</span>}
            {status.kind === "idle" && saved && (
              <span className="text-muted-foreground">A cookie is saved.</span>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            {saved && (
              <Button variant="ghost" onClick={clear} disabled={busy}>
                Remove
              </Button>
            )}
            <Button onClick={save} disabled={busy || !input.trim()}>
              {busy ? <Loader className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          These cookies give full access to your Google account. They are stored encrypted on this
          Mac and are only ever sent to YouTube. While one is saved, playback is signed in, so
          watching here counts towards your account's history and recommendations.
        </p>
      </DialogContent>
    </Dialog>
  );
}
