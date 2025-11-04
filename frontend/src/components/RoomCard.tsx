import type { RoomSummary } from "../api";

type Props = {
  room: RoomSummary;
  onSelect: (room: RoomSummary) => void;
  isActive: boolean;
};

export function RoomCard({ room, onSelect, isActive }: Props) {
  return (
    <button
      onClick={() => onSelect(room)}
      className={`glass w-full text-left px-4 py-3 transition ${
        isActive ? "ring-2 ring-violet-500" : "hover:ring-2 hover:ring-violet-700/80"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{room.name}</h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            room.isLive
              ? "bg-rose-500/20 text-rose-300 border border-rose-400/40"
              : "bg-slate-800 text-slate-300 border border-slate-600/60"
          }`}
        >
          <span className="block h-2 w-2 rounded-full bg-current" />
          {room.isLive ? "En direct" : "Hors ligne"}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-300">/{room.slug}</p>
    </button>
  );
}
