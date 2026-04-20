import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useEffect, useRef, useState } from "react";
import { RefreshCcw, Loader } from "lucide-react";
import { listen } from "@tauri-apps/api/event";

export default function UpdateChecker() {
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const updateRef = useRef<Update | null>(null);
  const lastCheckTimeRef = useRef<number>(0);

  const checkForUpdate = async () => {
    try {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      // Only check if it's been at least an hour since the last check
      if (now - lastCheckTimeRef.current < oneHour) {
        return;
      }

      lastCheckTimeRef.current = now;
      const update = await check();

      if (update) {
        updateRef.current = update;
        await update.download((event) => {
          switch (event.event) {
            case "Started":
              break;
            case "Finished":
              setDownloadComplete(true);
              break;
          }
        });
      }
    } catch (error) {
      console.error("Update check failed:", error);
    }
  };

  const installAndRelaunch = async () => {
    if (updateRef.current) {
      setIsInstalling(true);
      try {
        await updateRef.current.install();
        await relaunch();
      } catch (error) {
        console.error("Update installation failed:", error);
        setIsInstalling(false);
      }
    }
  };

  useEffect(() => {
    // Initial check
    checkForUpdate();

    // Set up focus event listener
    const unlisten = listen("tauri://focus", () => {
      checkForUpdate();
    });

    return () => {
      unlisten.then((unlistenFn) => unlistenFn());
    };
  }, []);

  return (
    <>
      {downloadComplete && (
        <button
          onClick={installAndRelaunch}
          disabled={isInstalling}
          className="px-3 py-1 mt-2 mb-1 rounded-3xl bg-green-500 text-white text-sm dark:bg-green-600 flex flex-row gap-2 items-center"
        >
          {isInstalling ? (
            <Loader size={16} strokeWidth={1.5} className="animate-spin" />
          ) : (
            <RefreshCcw size={16} strokeWidth={1.5} />
          )}
          <span>{isInstalling ? "Installing..." : "Update Available"}</span>
        </button>
      )}
    </>
  );
}
