import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { extractVideoId, formatChatMessage, getChatTargetFromArgs } from "../src/live-chat-viewer";

describe("extractVideoId", () => {
  test("returns plain YouTube video ids unchanged", () => {
    assert.equal(extractVideoId("ZEgMAPLXYjE"), "ZEgMAPLXYjE");
  });

  test("extracts the id from a youtube watch url", () => {
    assert.equal(extractVideoId("https://www.youtube.com/watch?v=ZEgMAPLXYjE&ab_channel=Andrea"), "ZEgMAPLXYjE");
  });

  test("extracts the id from a youtu.be url", () => {
    assert.equal(extractVideoId("https://youtu.be/ZEgMAPLXYjE?t=120"), "ZEgMAPLXYjE");
  });
});

describe("formatChatMessage", () => {
  test("renders timestamp, author, badges, and text", () => {
    assert.equal(
      formatChatMessage({
        publishedAt: "2026-05-12T19:10:11Z",
        authorName: "Andrea",
        text: "ciao chat",
        isOwner: true,
        isModerator: false,
        isSponsor: true,
      }),
      "[21:10:11] Andrea [owner, member]: ciao chat",
    );
  });

  test("omits badges when the user has none", () => {
    assert.equal(
      formatChatMessage({
        publishedAt: "2026-05-12T19:10:11Z",
        authorName: "Utente",
        text: "ciao",
        isOwner: false,
        isModerator: false,
        isSponsor: false,
      }),
      "[21:10:11] Utente: ciao",
    );
  });
});

describe("getChatTargetFromArgs", () => {
  test("defaults to the active live broadcast when no video is provided", () => {
    assert.deepEqual(getChatTargetFromArgs([]), { kind: "active" });
  });

  test("uses active live broadcast when --active is explicit", () => {
    assert.deepEqual(getChatTargetFromArgs(["--send", "--active"]), { kind: "active" });
  });

  test("uses explicit video argument when provided", () => {
    assert.deepEqual(getChatTargetFromArgs(["--send", "https://youtu.be/ZEgMAPLXYjE?t=120"]), {
      kind: "video",
      videoId: "ZEgMAPLXYjE",
    });
  });

  test("uses --video value when provided", () => {
    assert.deepEqual(getChatTargetFromArgs(["--video=ZEgMAPLXYjE"]), {
      kind: "video",
      videoId: "ZEgMAPLXYjE",
    });
  });
});
