import { useEffect } from "react";
import Hls from "hls.js";

export function useHls(source: string | null, videoRef: React.RefObject<HTMLVideoElement>) {
  useEffect(() => {
    const video = videoRef.current;
    if (!source || !video) {
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = source;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false
      });

      hls.loadSource(source);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
      };
    }

    console.warn("HLS non supporté par ce navigateur");
  }, [source, videoRef]);
}
