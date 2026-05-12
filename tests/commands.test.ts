import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createCooldown, resolveCommand } from "../src/commands";

describe("resolveCommand", () => {
  test("returns compact help without progetto", () => {
    assert.equal(
      resolveCommand("!help", "@utente", new Date("2026-05-12T18:00:00+02:00")),
      "@utente Comandi: !telegram !github !schedule !podcast !pi !claude",
    );
  });

  test("supports !comandi as help alias", () => {
    assert.equal(
      resolveCommand("!comandi", "@utente", new Date("2026-05-12T18:00:00+02:00")),
      "@utente Comandi: !telegram !github !schedule !podcast !pi !claude",
    );
  });

  test("returns the telegram response", () => {
    assert.equal(
      resolveCommand("!telegram", "@utente", new Date("2026-05-12T18:00:00+02:00")),
      "@utente Seguimi anche su Telegram: canale https://t.me/elektronvolt - community https://t.me/elektronvolt_community",
    );
  });

  test("returns the github response", () => {
    assert.equal(resolveCommand("!github", "@utente", new Date("2026-05-12T18:00:00+02:00")), "@utente GitHub: https://github.com/vekexasia");
  });

  test("returns the podcast response", () => {
    assert.equal(
      resolveCommand("!podcast", "@utente", new Date("2026-05-12T18:00:00+02:00")),
      "@utente Mi trovi anche nel podcast Senza un Briciolo di Tesla: https://www.youtube.com/@senzaunbricioloditesla1628",
    );
  });

  test("returns the pi response", () => {
    assert.equal(resolveCommand("!pi", "@utente", new Date("2026-05-12T18:00:00+02:00")), "@utente Pi è il coding agent che sto usando in live. Link: https://pi.dev");
  });

  test("returns the claude response", () => {
    assert.equal(resolveCommand("!claude", "@utente", new Date("2026-05-12T18:00:00+02:00")), "@utente Claude è uno dei modelli che puoi usare con Pi. Per il tool vedi !pi");
  });

  test("ignores non-commands and unknown commands", () => {
    assert.equal(resolveCommand("ciao", "@utente", new Date("2026-05-12T18:00:00+02:00")), undefined);
    assert.equal(resolveCommand("!progetto", "@utente", new Date("2026-05-12T18:00:00+02:00")), undefined);
  });

  test("matches commands case-insensitively and ignores trailing text", () => {
    assert.equal(resolveCommand("!HELP grazie", "@utente", new Date("2026-05-12T18:00:00+02:00")), "@utente Comandi: !telegram !github !schedule !podcast !pi !claude");
  });
});

describe("schedule command", () => {
  test("on monday points to tuesday live", () => {
    assert.equal(
      resolveCommand("!schedule", "@utente", new Date("2026-05-11T12:00:00+02:00")),
      "@utente Prossimo appuntamento: martedì alle 21:00 live AI + coding. Iscriviti e attiva la campanella per non perderla.",
    );
  });

  test("on tuesday before 21 points to tonight", () => {
    assert.equal(
      resolveCommand("!schedule", "@utente", new Date("2026-05-12T20:59:59+02:00")),
      "@utente Prossimo appuntamento: stasera alle 21:00 live AI + coding. Iscriviti e attiva la campanella per non perderla.",
    );
  });

  test("on tuesday from 21 points to thursday", () => {
    assert.equal(
      resolveCommand("!schedule", "@utente", new Date("2026-05-12T21:00:00+02:00")),
      "@utente Prossimo appuntamento: giovedì alle 21:00 live AI + coding. Iscriviti e attiva la campanella per non perderla.",
    );
  });

  test("on wednesday points to thursday", () => {
    assert.equal(
      resolveCommand("!schedule", "@utente", new Date("2026-05-13T12:00:00+02:00")),
      "@utente Prossimo appuntamento: giovedì alle 21:00 live AI + coding. Iscriviti e attiva la campanella per non perderla.",
    );
  });

  test("on thursday before 21 points to tonight", () => {
    assert.equal(
      resolveCommand("!schedule", "@utente", new Date("2026-05-14T20:59:59+02:00")),
      "@utente Prossimo appuntamento: stasera alle 21:00 live AI + coding. Iscriviti e attiva la campanella per non perderla.",
    );
  });

  test("on thursday from 21 points to sunday podcast", () => {
    assert.equal(
      resolveCommand("!schedule", "@utente", new Date("2026-05-14T21:00:00+02:00")),
      "@utente Prossimo appuntamento: domenica podcast Senza un Briciolo di Tesla: https://www.youtube.com/@senzaunbricioloditesla1628",
    );
  });

  test("on friday, saturday, and sunday points to sunday podcast", () => {
    const expected = "@utente Prossimo appuntamento: domenica podcast Senza un Briciolo di Tesla: https://www.youtube.com/@senzaunbricioloditesla1628";
    assert.equal(resolveCommand("!schedule", "@utente", new Date("2026-05-15T12:00:00+02:00")), expected);
    assert.equal(resolveCommand("!schedule", "@utente", new Date("2026-05-16T12:00:00+02:00")), expected);
    assert.equal(resolveCommand("!schedule", "@utente", new Date("2026-05-17T23:59:59+02:00")), expected);
  });
});

describe("createCooldown", () => {
  test("allows a command only once every 30 seconds globally", () => {
    const cooldown = createCooldown(30_000);

    assert.equal(cooldown.canRun("help", 1_000), true);
    assert.equal(cooldown.canRun("help", 20_000), false);
    assert.equal(cooldown.canRun("telegram", 20_000), true);
    assert.equal(cooldown.canRun("help", 31_000), true);
  });
});
