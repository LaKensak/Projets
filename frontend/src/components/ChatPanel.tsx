import { FormEvent, useEffect, useRef, useState } from "react";
import type { Message } from "../api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/fr";

dayjs.extend(relativeTime);
dayjs.locale("fr");

type Props = {
  messages: Message[];
  onSend: (content: string) => Promise<void>;
  isConnected: boolean;
  displayName: string;
};

export function ChatPanel({ messages, onSend, isConnected, displayName }: Props) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }
    try {
      setSending(true);
      setError(null);
      await onSend(trimmed);
      setInput("");
    } catch (err) {
      console.error(err);
      setError("Message non envoyé");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Chat</h3>
        <span
          className={`text-xs ${
            isConnected ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {isConnected ? "Connecté" : "Déconnecté"}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.map((message) => (
          <div key={message.id} className="rounded-lg bg-slate-900/70 px-3 py-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-200">{message.author}</span>
              <span>{dayjs(message.createdAt).fromNow()}</span>
            </div>
            <p className="mt-1 text-sm text-slate-100">{message.content}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          type="text"
          className="flex-1 rounded-lg bg-slate-900/70 px-3 py-2 text-sm outline-none ring-1 ring-transparent transition focus:ring-violet-500"
          placeholder="Envoyer un message..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={500}
          disabled={!isConnected}
        />
        <button
          type="submit"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-700"
          disabled={!isConnected || !input.trim() || sending}
        >
          {sending ? "Envoi..." : "Envoyer"}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
      <p className="mt-2 text-xs text-slate-400">
        Connecté en tant que <span className="font-semibold text-slate-200">{displayName}</span>
      </p>
    </div>
  );
}
