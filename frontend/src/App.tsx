import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { api, type JoinResponse, type Message, type RoomSummary } from "./api";
import { RoomCard } from "./components/RoomCard";
import { Player } from "./components/Player";
import { ChatPanel } from "./components/ChatPanel";

export default function App() {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomSummary | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [joinInfo, setJoinInfo] = useState<JoinResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const socketBaseUrl = useMemo(() => {
    if (import.meta.env.VITE_BACKEND_SOCKET_URL) {
      return import.meta.env.VITE_BACKEND_SOCKET_URL;
    }
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  }, []);

  const sortedRooms = useMemo(
    () =>
      [...rooms].sort((a, b) => {
        if (a.isLive === b.isLive) {
          return a.name.localeCompare(b.name);
        }
        return a.isLive ? -1 : 1;
      }),
    [rooms]
  );

  useEffect(() => {
    let active = true;
    const loadRooms = async () => {
      try {
        const { data } = await api.get<{ rooms: RoomSummary[] }>("/api/rooms");
        if (active) {
          setRooms(data.rooms);
          if (selectedRoom) {
            const updated = data.rooms.find((room) => room.slug === selectedRoom.slug);
            if (updated) {
              setSelectedRoom(updated);
              setIsLive(updated.isLive);
            }
          }
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError("Impossible de charger les salons");
        }
      }
    };

    loadRooms();
    const interval = setInterval(loadRooms, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedRoom]);

  useEffect(() => {
    if (!selectedRoom || !joinInfo) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
      return;
    }

    const targetUrl = socketBaseUrl || "http://localhost:4000";
    const socket = io(targetUrl, {
      transports: ["websocket"],
      withCredentials: true,
      auth: {
        slug: selectedRoom.slug,
        token: joinInfo.chat.token,
        displayName: joinInfo.chat.displayName
      }
    });

    socketRef.current = socket;

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("chat:history", (history: Message[]) => setMessages(history));
    socket.on("chat:message", (message: Message) =>
      setMessages((prev) => [...prev, message])
    );
    socket.on("stream:status", (payload: { isLive: boolean }) => {
      setIsLive(payload.isLive);
    });

    return () => {
      socket.disconnect();
      setSocketConnected(false);
    };
  }, [selectedRoom, joinInfo]);

  const handleSelectRoom = (room: RoomSummary) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSelectedRoom(room);
    setMessages([]);
    setJoinInfo(null);
    setDisplayName("");
    setIsLive(room.isLive);
    setError(null);
  };

  const submitJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRoom) {
      return;
    }
    if (!displayName.trim()) {
      setError("Choisis un pseudo");
      return;
    }
    setIsJoining(true);
    setError(null);
    try {
      const { data } = await api.post<JoinResponse>(
        `/api/rooms/${selectedRoom.slug}/join`,
        {
          displayName: displayName.trim()
        }
      );
      setJoinInfo(data);
      setSelectedRoom(data.room);
      setIsLive(data.room.isLive);
    } catch (err) {
      console.error(err);
      setError("Impossible de rejoindre le salon");
    } finally {
      setIsJoining(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!socketRef.current) {
      throw new Error("Socket non initialisé");
    }
    await new Promise<void>((resolve, reject) => {
      socketRef.current?.emit("chat:message", { content }, (response?: { success: boolean; error?: string }) => {
        if (response?.success) {
          resolve();
        } else {
          reject(new Error(response?.error ?? "Erreur d'envoi"));
        }
      });
    });
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">StreamCircle</h1>
          <p className="text-sm text-slate-300">
            Stream privé entre amis : OBS → RTMP → HLS.
          </p>
        </div>
        <span className="text-xs text-slate-400">Prototype self-hosted</span>
      </header>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <main className="mt-6 grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="space-y-4">
          <div className="glass p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Salons</h2>
              <span className="text-xs text-slate-400">{rooms.length}</span>
            </div>
            <div className="mt-4 space-y-3">
              {sortedRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onSelect={handleSelectRoom}
                  isActive={selectedRoom?.id === room.id}
                />
              ))}
              {sortedRooms.length === 0 && (
                <p className="text-sm text-slate-400">Aucun salon disponible.</p>
              )}
            </div>
          </div>
          <div className="glass p-4 text-sm text-slate-300">
            <h3 className="text-base font-semibold text-slate-100">Comment streamer ?</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Récupère ta clé stream côté admin et configure OBS.</li>
              <li>URL : <code className="select-all text-xs">rtmp://&lt;host&gt;:1935/live/&lt;CLE&gt;</code></li>
              <li>Lance OBS, tes amis rejoignent le salon ici.</li>
            </ol>
          </div>
        </aside>

        <section className="space-y-4">
          {!selectedRoom && (
            <div className="glass flex h-full flex-col items-center justify-center p-10 text-center text-slate-300">
              <h2 className="text-2xl font-semibold text-slate-100">
                Sélectionne un salon
              </h2>
              <p className="mt-2 text-sm">
                Choisis un salon à gauche pour lancer le lecteur et le chat.
              </p>
            </div>
          )}

          {selectedRoom && !joinInfo && (
            <div className="glass p-6">
              <h2 className="text-xl font-semibold">{selectedRoom.name}</h2>
              <p className="mt-1 text-sm text-slate-300">
                Entre un pseudo pour rejoindre le chat et le stream.
              </p>
              <form onSubmit={submitJoin} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  placeholder="Ton pseudo"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={32}
                  className="flex-1 rounded-lg bg-slate-900/70 px-3 py-2 text-sm outline-none ring-1 ring-transparent transition focus:ring-violet-500"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                  disabled={isJoining || !displayName.trim()}
                >
                  {isJoining ? "Connexion..." : "Rejoindre"}
                </button>
              </form>
            </div>
          )}

          {selectedRoom && joinInfo && (
            <div className="grid gap-4 xl:grid-cols-[2fr,1fr]">
              <Player
                room={joinInfo.room}
                isLive={isLive}
                onReload={() => setIsLive(joinInfo.room.isLive)}
              />
              <ChatPanel
                messages={messages}
                onSend={sendMessage}
                isConnected={socketConnected}
                displayName={joinInfo.chat.displayName}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
