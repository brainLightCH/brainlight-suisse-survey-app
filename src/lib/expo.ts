export function parseStation(param: string): number | null {
  const n = Number(param);
  if (!Number.isInteger(n) || n < 1 || n > 4) return null;
  return n;
}

export function expoEventName(): string {
  return process.env.EXPO_EVENT_NAME?.trim() || "Expo";
}
