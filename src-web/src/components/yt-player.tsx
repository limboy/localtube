import { useEffect, useRef, useState } from "react";

interface YTPlayerEvent {
  data: number;
}

interface IFramePlayer {
  loadVideoById: (params: { videoId: string }) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
}

export default function YTPlayer({
  videoId,
  onVideoEnd,
  forceReplay = false
}: {
  videoId: string;
  onVideoEnd?: () => void;
  forceReplay?: boolean;
}) {
  const playerRef = useRef<IFramePlayer | null>(null);
  const [isAPIReady, setIsAPIReady] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Initial API loading effect
  useEffect(() => {
    // Check if API is already loaded
    if ((window as any).YT && (window as any).YT.Player) {
      setIsAPIReady(true);
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode!.insertBefore(tag, firstScriptTag);

    const oldCallback = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (oldCallback) oldCallback();
      setIsAPIReady(true);
    };

    return () => {
      (window as any).onYouTubeIframeAPIReady = oldCallback;
    };
  }, []);

  // Player initialization effect
  useEffect(() => {
    if (!isAPIReady) return;

    if (!playerRef.current) {
      const player = new (window as any).YT.Player("player", {
        height: '100%',
        width: '100%',
        playerVars: {
          playsinline: 1,
          disablekb: 0,
          enablejsapi: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
          controls: 1,
          rel: 0,
          autoplay: 1,
          mute: 0
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onAutoplayBlocked: onAutoplayBlocked,
          onError: onErrorOccured
        }
      });

      console.log('Player created:', player);
      playerRef.current = player;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [isAPIReady]); // Only depend on API ready state

  // Video loading effect
  useEffect(() => {
    if (playerRef.current && videoId && isPlayerReady) {
      if (forceReplay) {
        playerRef.current.seekTo(0, true);
      } else {
        playerRef.current.loadVideoById({ videoId });
      }
    }
  }, [videoId, forceReplay, isPlayerReady]);

  const onPlayerReady = () => {
    console.log('Player ready:', playerRef.current);
    setIsPlayerReady(true);
    if (videoId && playerRef.current) {
      playerRef.current.loadVideoById({ videoId });
    }
  };

  const onErrorOccured = (event: YTPlayerEvent) => {
    console.log("error occured: " + event.data);
  };

  const onAutoplayBlocked = (_event: YTPlayerEvent) => {
    // console.log("autoplay blocked: " + event.data);
  };

  const onPlayerStateChange = (event: YTPlayerEvent) => {
    if (event.data === 0 && onVideoEnd) {
      onVideoEnd();
    }
  };

  return <div id="player" className="w-full h-full bg-black"></div>;
}
