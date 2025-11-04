import { customAlphabet } from "nanoid";

const slugId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);
const keyId = customAlphabet("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 36);

export function createSlug(name: string): string {
  const trimmed = name.trim().toLowerCase();
  const base = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return `${base}-${slugId()}`;
}

export function generateStreamKey(): string {
  return keyId();
}

export function generatePlaybackKey(): string {
  return keyId();
}
