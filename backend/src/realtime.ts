import EventEmitter from "events";

export type RoomStatusEvent = {
  roomId: string;
  slug: string;
  isLive: boolean;
};

class RealtimeBus extends EventEmitter {}

const bus = new RealtimeBus();

export function emitRoomStatus(event: RoomStatusEvent) {
  bus.emit("room:status", event);
}

export function onRoomStatus(handler: (event: RoomStatusEvent) => void) {
  bus.on("room:status", handler);
}
