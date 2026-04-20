import { useEffect, useRef, useState } from "react";
import { RefreshCcw, Loader } from "lucide-react";

export default function UpdateChecker() {
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const lastCheckTimeRef = useRef<number>(0);

  const checkForUpdate = async () => {
    try {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      if (now - lastCheckTimeRef.current < oneHour) {
        return;
      }

      lastCheckTimeRef.current = now;
      const result = await window.electron.updater.check();

      if (result.hasUpdate) {
        await window.electron.updater.download();
      }
    } catch (error) {
      console.error("Update check failed:", error);
    }
  };

  const installAndRelaunch = async () => {
    setIsInstalling(true);
    try {
      await window.electron.updater.install();
    } catch (error) {
      console.error("Update installation failed:", error);
      setIsInstalling(false);
    }
  };

  useEffect(() => {
    checkForUpdate();

    const unlistenFocus = window.electron.onWindowFocus(() => {
      checkForUpdate();
    });
    const unlistenDownloaded = window.electron.onUpdateDownloaded(() => {
      setDownloadComplete(true);
    });

    return () => {
      unlistenFocus();
      unlistenDownloaded();
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
