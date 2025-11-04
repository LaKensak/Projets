import { useRef } from "react";
import { useHls } from "../hooks/useHls";
import type { RoomSummary } from "../api";

type Props = {
  room: RoomSummary;
  isLive: boolean;
  onReload?: () => void;
};

export function Player({ room, isLive, onReload }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useHls(room.hlsUrl, videoRef);

  return (
    <div className="glass relative flex aspect-video w-full flex-col overflow-hidden">
      <video
        ref={videoRef}
        className="h-full w-full bg-black object-contain"
        controls
        autoPlay
        playsInline
      />
      {!isLive && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
          <div className="text-center">
            <p className="text-2xl font-semibold">Stream offline</p>
            <p className="mt-2 text-sm text-slate-300">
              Le streamer n&apos;est pas en direct.
            </p>
            {onReload && (
              <button
                onClick={onReload}
                className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500"
              >
                Recharger
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
