export const CHANNEL_NAME_MAX = 80;

export function invalidChannelName(name: string) {
  const cleaned = name.trim();
  if (
    cleaned.length < 1 ||
    cleaned.length > CHANNEL_NAME_MAX ||
    /[\u0000-\u001F\u007F]/.test(cleaned)
  ) {
    return "channel name must be 1 to 80 characters";
  }
  return null;
}
