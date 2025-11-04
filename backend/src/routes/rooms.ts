import { Router } from "express";
import createError from "http-errors";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler, assertAdmin } from "../utils/http";
import { createSlug, generatePlaybackKey, generateStreamKey } from "../utils/identifiers";
import { hlsBaseUrl } from "../env";

const router = Router();

const createRoomSchema = z.object({
  name: z.string().min(3).max(100)
});

const joinSchema = z.object({
  displayName: z.string().min(1).max(32)
});

type RoomPayload = {
  id: string;
  name: string;
  slug: string;
  streamKey: string;
  playbackKey: string;
  isLive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toPublicRoom(room: RoomPayload) {
  return {
    id: room.id,
    name: room.name,
    slug: room.slug,
    isLive: room.isLive,
    hlsUrl: `${hlsBaseUrl}/${room.streamKey}/index.m3u8`,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt
  };
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rooms = await prisma.room.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json({
      rooms: rooms.map(toPublicRoom)
    });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    assertAdmin(req);
    const payload = createRoomSchema.parse(req.body);

    const slug = createSlug(payload.name);
    const streamKey = generateStreamKey();
    const playbackKey = generatePlaybackKey();

    const room = await prisma.room.create({
      data: {
        name: payload.name,
        slug,
        streamKey,
        playbackKey
      }
    });

    res.status(201).json({
      room: toPublicRoom(room),
      admin: {
        streamKey: room.streamKey,
        playbackKey: room.playbackKey
      }
    });
  })
);

router.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const room = await prisma.room.findUnique({
      where: { slug: req.params.slug }
    });

    if (!room) {
      throw createError(404, "salon introuvable");
    }

    res.json({
      room: toPublicRoom(room)
    });
  })
);

router.post(
  "/:slug/join",
  asyncHandler(async (req, res) => {
    const payload = joinSchema.parse(req.body);

    const room = await prisma.room.findUnique({
      where: { slug: req.params.slug }
    });

    if (!room) {
      throw createError(404, "salon introuvable");
    }

    res.json({
      room: toPublicRoom(room),
      chat: {
        token: room.playbackKey,
        displayName: payload.displayName
      }
    });
  })
);

router.post(
  "/:slug/rotate",
  asyncHandler(async (req, res) => {
    assertAdmin(req);

    const room = await prisma.room.findUnique({
      where: { slug: req.params.slug }
    });

    if (!room) {
      throw createError(404, "salon introuvable");
    }

    const updated = await prisma.room.update({
      where: { id: room.id },
      data: {
        streamKey: generateStreamKey(),
        playbackKey: generatePlaybackKey(),
        isLive: false
      }
    });

    res.json({
      room: toPublicRoom(updated),
      admin: {
        streamKey: updated.streamKey,
        playbackKey: updated.playbackKey
      }
    });
  })
);

router.get(
  "/:slug/messages",
  asyncHandler(async (req, res) => {
    const room = await prisma.room.findUnique({
      where: { slug: req.params.slug }
    });

    if (!room) {
      throw createError(404, "salon introuvable");
    }

    const messages = await prisma.message.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    res.json({
      messages: messages
        .reverse()
        .map((msg) => ({
          id: msg.id,
          author: msg.author,
          content: msg.content,
          createdAt: msg.createdAt
        }))
    });
  })
);

export default router;
