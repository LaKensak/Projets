import { Router } from "express";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/http";
import { emitRoomStatus } from "../realtime";

const router = Router();

function extractStreamKey(req: any): string | null {
  if (typeof req.body?.name === "string") {
    return req.body.name;
  }
  if (typeof req.query?.name === "string") {
    return req.query.name;
  }
  return null;
}

router.post(
  "/publish",
  asyncHandler(async (req, res) => {
    const streamKey = extractStreamKey(req);
    if (!streamKey) {
      return res.status(400).send("missing stream key");
    }

    const room = await prisma.room.findUnique({
      where: { streamKey }
    });

    if (!room) {
      return res.status(403).send("stream key rejected");
    }

    if (!room.isLive) {
      await prisma.room.update({
        where: { id: room.id },
        data: { isLive: true }
      });
      emitRoomStatus({ roomId: room.id, slug: room.slug, isLive: true });
    }

    res.status(200).send("ok");
  })
);

router.post(
  "/done",
  asyncHandler(async (req, res) => {
    const streamKey = extractStreamKey(req);
    if (!streamKey) {
      return res.status(200).send("ok");
    }

    const room = await prisma.room.findUnique({
      where: { streamKey }
    });

    if (room && room.isLive) {
      await prisma.room.update({
        where: { id: room.id },
        data: { isLive: false }
      });
      emitRoomStatus({ roomId: room.id, slug: room.slug, isLive: false });
    }

    res.status(200).send("ok");
  })
);

export default router;
