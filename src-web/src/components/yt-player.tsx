import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";

interface YTPlayerEvent {
  data: number;
}

interface IFramePlayer {
  loadVideoById: (params: { videoId: string }) => void;
  cueVideoById: (params: { videoId: string }) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
}

export interface YTPlayerHandle {
  getCurrentTime: () => number;
  getDuration: () => number;
}

const YTPlayer = forwardRef<YTPlayerHandle, {
  videoId: string;
  onVideoEnd?: () => void;
  onPlay?: () => void;
  forceReplay?: boolean;
  autoPlay?: boolean;
  startSeconds?: number;
}>(function YTPlayer({
  videoId,
  onVideoEnd,
  onPlay,
  forceReplay = false,
  autoPlay = true,
  startSeconds,
}, ref) {
  const playerRef = useRef<IFramePlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAPIReady, setIsAPIReady] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const pendingSeekRef = useRef<number | null>(null);
  const playFiredRef = useRef(false);

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
    getDuration: () => playerRef.current?.getDuration() ?? 0,
  }));

  // Initial API loading effect
  useEffect(() => {
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
    if (!isAPIReady || !containerRef.current) return;

    if (!playerRef.current) {
      const playerEl = document.createElement("div");
      containerRef.current.appendChild(playerEl);

      const player = new (window as any).YT.Player(playerEl, {
        height: '100%',
        width: '100%',
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          playsinline: 1,
          disablekb: 0,
          enablejsapi: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
          controls: 1,
          rel: 0,
          autoplay: 1,
          mute: 0,
          origin: window.location.origin
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
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [isAPIReady]);

  const startSecondsRef = useRef(startSeconds);
  startSecondsRef.current = startSeconds;

  // Video loading effect
  useEffect(() => {
    if (playerRef.current && videoId && isPlayerReady) {
      if (forceReplay) {
        pendingSeekRef.current = null;
        playFiredRef.current = false;
        playerRef.current.seekTo(0, true);
      } else {
        pendingSeekRef.current = startSecondsRef.current ?? null;
        playFiredRef.current = false;
        if (autoPlay) {
          playerRef.current.loadVideoById({ videoId });
        } else {
          (playerRef.current as any).cueVideoById({ videoId });
        }
      }
    }
  }, [videoId, forceReplay, isPlayerReady, autoPlay]);

  const onPlayerReady = () => {
    console.log('Player ready:', playerRef.current);
    setIsPlayerReady(true);
    if (videoId && playerRef.current) {
      pendingSeekRef.current = startSecondsRef.current ?? null;
      if (autoPlay) {
        playerRef.current.loadVideoById({ videoId });
      } else {
        (playerRef.current as any).cueVideoById({ videoId });
      }
    }
  };

  const onErrorOccured = (event: YTPlayerEvent) => {
    console.log("error occured: " + event.data);
  };

  const onAutoplayBlocked = (_event: YTPlayerEvent) => {
    // console.log("autoplay blocked: " + event.data);
  };

  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;

  const onPlayerStateChange = (event: YTPlayerEvent) => {
    // YT.PlayerState.PLAYING === 1
    if (event.data === 1) {
      if (pendingSeekRef.current !== null) {
        const seekTo = pendingSeekRef.current;
        pendingSeekRef.current = null;
        playerRef.current?.seekTo(seekTo, true);
      }
      if (!playFiredRef.current) {
        playFiredRef.current = true;
        onPlayRef.current?.();
      }
    }
    if (event.data === 0 && onVideoEnd) {
      onVideoEnd();
    }
  };

  return <div ref={containerRef} className="w-full h-full bg-black"></div>;
});

export default YTPlayer;
