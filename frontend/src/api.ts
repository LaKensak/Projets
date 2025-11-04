import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const api = axios.create({
  baseURL,
  withCredentials: true
});

export type RoomSummary = {
  id: string;
  name: string;
  slug: string;
  isLive: boolean;
  hlsUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type JoinResponse = {
  room: RoomSummary;
  chat: {
    token: string;
    displayName: string;
  };
};

export type Message = {
  id: string;
  author: string;
  content: string;
  createdAt: string;
};
