import { readFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { createCooldown, getCommandName, resolveCommand } from "./commands";

type StoredCredentials = {
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  installed?: {
    client_id?: string;
    client_secret?: string;
  };
  web?: {
    client_id?: string;
    client_secret?: string;
  };
};

export type ChatMessage = {
  publishedAt: string;
  authorName: string;
  text: string;
  isOwner: boolean;
  isModerator: boolean;
  isSponsor: boolean;
};

type WatchOptions = {
  sendReplies: boolean;
};

export type ChatTarget =
  | { kind: "active" }
  | { kind: "video"; videoId: string };

export function extractVideoId(input: string): string {
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  const url = new URL(input);
  if (url.hostname === "youtu.be") return url.pathname.replace(/^\//, "").slice(0, 11);

  const watchId = url.searchParams.get("v");
  if (watchId) return watchId;

  const parts = url.pathname.split("/").filter(Boolean);
  const liveIndex = parts.indexOf("live");
  if (liveIndex >= 0 && parts[liveIndex + 1]) return parts[liveIndex + 1];

  throw new Error(`Cannot extract YouTube video id from: ${input}`);
}

export function formatChatMessage(message: ChatMessage): string {
  const time = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(message.publishedAt));

  const badges = [
    message.isOwner ? "owner" : undefined,
    message.isModerator ? "mod" : undefined,
    message.isSponsor ? "member" : undefined,
  ].filter(Boolean);

  const badgeText = badges.length > 0 ? ` [${badges.join(", ")}]` : "";
  return `[${time}] ${message.authorName}${badgeText}: ${message.text}`;
}

async function loadAuth(): Promise<OAuth2Client> {
  const credentialsPath = process.env.YOUTUBE_CREDENTIALS_FILE ?? `${homedir()}/.config/youtube-data-cli/credentials.json`;
  const credentials = JSON.parse(await readFile(credentialsPath, "utf8")) as StoredCredentials;
  const clientId = credentials.client_id ?? credentials.installed?.client_id ?? credentials.web?.client_id;
  const clientSecret = credentials.client_secret ?? credentials.installed?.client_secret ?? credentials.web?.client_secret;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN ?? credentials.refresh_token;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(`Missing client_id, client_secret, or refresh_token in ${credentialsPath}`);
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}

async function getLiveChatId(auth: OAuth2Client, videoId: string): Promise<string> {
  const youtube = google.youtube({ version: "v3", auth });
  const response = await youtube.videos.list({
    id: [videoId],
    part: ["liveStreamingDetails", "snippet"],
  });

  const video = response.data.items?.[0];
  if (!video) throw new Error(`Video not found: ${videoId}`);

  const liveChatId = video.liveStreamingDetails?.activeLiveChatId;
  if (!liveChatId) {
    const title = video.snippet?.title ?? videoId;
    throw new Error(`No active live chat found for: ${title}`);
  }

  return liveChatId;
}

async function getActiveLiveChatId(auth: OAuth2Client): Promise<{ liveChatId: string; title: string }> {
  const youtube = google.youtube({ version: "v3", auth });
  const response = await youtube.liveBroadcasts.list({
    mine: true,
    broadcastType: "event",
    maxResults: 50,
    part: ["snippet", "status"],
  });

  const broadcast = response.data.items?.find((item) => item.status?.lifeCycleStatus === "live");
  if (!broadcast) throw new Error("No active YouTube live broadcast found");

  const liveChatId = broadcast.snippet?.liveChatId;
  if (!liveChatId) {
    const title = broadcast.snippet?.title ?? broadcast.id ?? "active broadcast";
    throw new Error(`No active live chat found for: ${title}`);
  }

  return {
    liveChatId,
    title: broadcast.snippet?.title ?? broadcast.id ?? "active broadcast",
  };
}
async function sendChatMessage(youtube: ReturnType<typeof google.youtube>, liveChatId: string, text: string): Promise<void> {
  await youtube.liveChatMessages.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        liveChatId,
        type: "textMessageEvent",
        textMessageDetails: {
          messageText: text,
        },
      },
    },
  });
}

async function watchLiveChat(target: ChatTarget, options: WatchOptions): Promise<void> {
  const auth = await loadAuth();
  const youtube = google.youtube({ version: "v3", auth });
  const chat = target.kind === "active"
    ? await getActiveLiveChatId(auth)
    : { liveChatId: await getLiveChatId(auth, target.videoId), title: target.videoId };
  const cooldown = createCooldown(30_000);
  const startedAt = Date.now() - 5_000;

  let pageToken: string | undefined;
  console.log(`Watching live chat for ${chat.title}`);
  console.log(options.sendReplies ? "Command replies enabled." : "Command replies disabled: dry-run mode.");
  console.log("Press Ctrl+C to stop.\n");

  while (true) {
    const response = await youtube.liveChatMessages.list({
      liveChatId: chat.liveChatId,
      part: ["snippet", "authorDetails"],
      pageToken,
    });

    for (const item of response.data.items ?? []) {
      const message: ChatMessage = {
        publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
        authorName: item.authorDetails?.displayName ?? "unknown",
        text: item.snippet?.displayMessage ?? "",
        isOwner: item.authorDetails?.isChatOwner ?? false,
        isModerator: item.authorDetails?.isChatModerator ?? false,
        isSponsor: item.authorDetails?.isChatSponsor ?? false,
      };

      if (message.text) console.log(formatChatMessage(message));

      const commandName = getCommandName(message.text);
      const reply = resolveCommand(message.text, message.authorName, new Date());
      const messageTime = new Date(message.publishedAt).getTime();
      if (commandName && reply && messageTime >= startedAt && cooldown.canRun(commandName)) {
        if (options.sendReplies) {
          await sendChatMessage(youtube, chat.liveChatId, reply);
          console.log(`  -> BOT: ${reply}`);
        } else {
          console.log(`  -> BOT (dry-run): ${reply}`);
        }
      }
    }

    pageToken = response.data.nextPageToken ?? undefined;
    await sleep(response.data.pollingIntervalMillis ?? 5000);
  }
}

export function getChatTargetFromArgs(args: string[]): ChatTarget {
  if (args.includes("--active")) return { kind: "active" };

  const explicit = args.find((arg) => arg.startsWith("--video="))?.slice("--video=".length);
  const positional = args.find((arg) => !arg.startsWith("--"));
  const value = explicit ?? positional ?? process.env.YOUTUBE_VIDEO_ID;
  if (!value) return { kind: "active" };
  return { kind: "video", videoId: extractVideoId(value) };
}

function getWatchOptions(args: string[]): WatchOptions {
  return {
    sendReplies: args.includes("--send") || process.env.YOUTUBE_SEND_REPLIES === "1",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  watchLiveChat(getChatTargetFromArgs(args), getWatchOptions(args)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
