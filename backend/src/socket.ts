import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { z } from "zod";
import { prisma } from "./prisma";
import { onRoomStatus } from "./realtime";

type SocketRoomData = {
  id: string;
  slug: string;
  name: string;
  displayName: string;
  token: string;
  isLive: boolean;
};

const handshakeSchema = z.object({
  slug: z.string().min(3),
  token: z.string().min(10),
  displayName: z.string().min(1).max(32)
});

const messageSchema = z.object({
  content: z.string().min(1).max(500)
});

export function setupSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    const payload = handshakeSchema.safeParse({
      slug:
        (socket.handshake.auth?.slug as string | undefined) ??
        (socket.handshake.query.slug as string | undefined),
      token:
        (socket.handshake.auth?.token as string | undefined) ??
        (socket.handshake.query.token as string | undefined),
      displayName:
        (socket.handshake.auth?.displayName as string | undefined) ??
        (socket.handshake.query.displayName as string | undefined)
    });

    if (!payload.success) {
      return next(new Error("unauthorized"));
    }

    try {
      const room = await prisma.room.findUnique({
        where: { slug: payload.data.slug }
      });

      if (!room || room.playbackKey !== payload.data.token) {
        return next(new Error("unauthorized"));
      }

      const data: SocketRoomData = {
        id: room.id,
        slug: room.slug,
        name: room.name,
        displayName: payload.data.displayName,
        token: payload.data.token,
        isLive: room.isLive
      };

      (socket.data as { room?: SocketRoomData }).room = data;

      return next();
    } catch (error) {
      return next(error as Error);
    }
  });

  io.on("connection", async (socket) => {
    const session = (socket.data as { room?: SocketRoomData }).room;
    if (!session) {
      socket.disconnect(true);
      return;
    }

    const channel = `room:${session.slug}`;
    socket.join(channel);

    const messages = await prisma.message.findMany({
      where: { roomId: session.id },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    socket.emit(
      "chat:history",
      messages.reverse().map((msg) => ({
        id: msg.id,
        author: msg.author,
        content: msg.content,
        createdAt: msg.createdAt
      }))
    );

    socket.emit("stream:status", { isLive: session.isLive });

    socket.on("chat:message", async (body, ack?: (response: { success: boolean; error?: string }) => void) => {
      const parsed = messageSchema.safeParse(body);
      if (!parsed.success) {
        ack?.({ success: false, error: "invalid payload" });
        return;
      }

      const message = await prisma.message.create({
        data: {
          roomId: session.id,
          author: session.displayName,
          content: parsed.data.content
        }
      });

      const payload = {
        id: message.id,
        author: message.author,
        content: message.content,
        createdAt: message.createdAt
      };

      io.to(channel).emit("chat:message", payload);
      ack?.({ success: true });
    });
  });

  onRoomStatus((event) => {
    io.to(`room:${event.slug}`).emit("stream:status", {
      isLive: event.isLive
    });
  });

  return io;
}
