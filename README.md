# YouTube Bot

Bot TypeScript/Node.js per leggere la chat live di YouTube e rispondere a comandi fissi.

## Setup

Il bot legge le credenziali OAuth da:

```txt
~/.config/youtube-data-cli/credentials.json
```

Formato supportato:

```json
{
  "client_id": "...",
  "client_secret": "...",
  "refresh_token": "..."
}
```

In alternativa:

```bash
YOUTUBE_CREDENTIALS_FILE=/path/to/credentials.json npm run live-chat
YOUTUBE_REFRESH_TOKEN=... npm run live-chat
```

## Uso

Dry-run sulla live attiva del canale:

```bash
npm run live-chat
```

Risposte reali sulla live attiva del canale:

```bash
npm run live-chat -- --send
```

Su una live specifica:

```bash
npm run live-chat -- --send https://www.youtube.com/watch?v=VIDEO_ID
```

## Comandi chat

- `!help` / `!comandi`
- `!telegram`
- `!github`
- `!schedule`
- `!podcast`
- `!pi`
- `!claude`

## Sviluppo

```bash
npm test
npx tsc --noEmit
```
