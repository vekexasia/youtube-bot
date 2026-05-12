const PODCAST_URL = "https://www.youtube.com/@senzaunbricioloditesla1628";

const responses: Record<string, string> = {
  help: "Comandi: !telegram !github !gitshield !schedule !podcast !pi !claude",
  comandi: "Comandi: !telegram !github !gitshield !schedule !podcast !pi !claude",
  telegram: "Seguimi anche su Telegram: canale https://t.me/elektronvolt - community https://t.me/elektronvolt_community",
  github: "GitHub: https://github.com/vekexasia",
  gitshield: "Git Shield è il safety net locale per vibe coding: blocca secret e PII prima che il codice lasci il computer. Repo: https://github.com/vekexasia/git-shield",
  "git-shield": "Git Shield è il safety net locale per vibe coding: blocca secret e PII prima che il codice lasci il computer. Repo: https://github.com/vekexasia/git-shield",
  podcast: `Mi trovi anche nel podcast Senza un Briciolo di Tesla: ${PODCAST_URL}`,
  pi: "Pi è il coding agent che sto usando in live. Link: https://pi.dev",
  claude: "Claude è uno dei modelli che puoi usare con Pi. Per il tool vedi !pi",
};

export function getCommandName(text: string): string | undefined {
  const token = text.trim().split(/\s+/, 1)[0];
  if (!token?.startsWith("!") || token.length === 1) return undefined;
  return token.slice(1).toLowerCase();
}

export function resolveCommand(text: string, mention: string, now = new Date()): string | undefined {
  const commandName = getCommandName(text);
  if (!commandName) return undefined;

  const response = commandName === "schedule" ? getScheduleResponse(now) : responses[commandName];
  if (!response) return undefined;

  return `${mention} ${response}`;
}

export function getScheduleResponse(now: Date): string {
  const rome = getRomeDateParts(now);
  const liveTonight = "Prossimo appuntamento: stasera alle 21:00 live AI + coding. Iscriviti e attiva la campanella per non perderla.";
  const tuesdayLive = "Prossimo appuntamento: martedì alle 21:00 live AI + coding. Iscriviti e attiva la campanella per non perderla.";
  const thursdayLive = "Prossimo appuntamento: giovedì alle 21:00 live AI + coding. Iscriviti e attiva la campanella per non perderla.";
  const sundayPodcast = `Prossimo appuntamento: domenica podcast Senza un Briciolo di Tesla: ${PODCAST_URL}`;

  if (rome.weekday === "Mon") return tuesdayLive;
  if (rome.weekday === "Tue") return isBefore21(rome) ? liveTonight : thursdayLive;
  if (rome.weekday === "Wed") return thursdayLive;
  if (rome.weekday === "Thu") return isBefore21(rome) ? liveTonight : sundayPodcast;
  return sundayPodcast;
}

export function createCooldown(durationMs: number) {
  const lastRun = new Map<string, number>();

  return {
    canRun(commandName: string, nowMs = Date.now()): boolean {
      const previous = lastRun.get(commandName);
      if (previous !== undefined && nowMs - previous < durationMs) return false;
      lastRun.set(commandName, nowMs);
      return true;
    },
  };
}

function getRomeDateParts(date: Date): { weekday: string; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return {
    weekday: get("weekday") ?? "",
    hour: Number(get("hour") ?? 0),
    minute: Number(get("minute") ?? 0),
  };
}

function isBefore21(parts: { hour: number; minute: number }): boolean {
  return parts.hour < 21 || (parts.hour === 20 && parts.minute <= 59);
}
