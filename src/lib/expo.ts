import { EXPO_STATIONS } from "./constants";

export function parseStation(param: string): number | null {
  const n = Number(param);
  if (!(EXPO_STATIONS as readonly number[]).includes(n)) return null;
  return n;
}

export function expoEventName(): string {
  return process.env.EXPO_EVENT_NAME?.trim() || "Expo";
}
