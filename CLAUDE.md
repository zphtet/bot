# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Deployment

Pushes to `main` automatically deploy to GCP Cloud Run via `.github/workflows/deploy.yml`.

Required GitHub Secrets:
- `GCP_PROJECT_ID` — your GCP project ID
- `GCP_SA_KEY` — GCP service account key JSON (needs Cloud Run, Container Registry, and Cloud Build permissions)
- `BOT_TOKEN` — Telegram bot token
- `COHERE_API_KEY` — Cohere API key

## Running the Bot

```bash
node bot.js
```

Requires a `.env` file with both `BOT_TOKEN` and `COHERE_API_KEY` before running.

## Commands

| Command | Behavior |
|---------|----------|
| `/start` | Sends a welcome message with the user's first name |
| `/clear` | Clears the conversation history for that user |
| any text | Sends the message to Cohere AI (with history) and replies with the response |

## Architecture

Bot is configured as a sales assistant for a mobile phone shop (ZPH Mobile Shop) via `BUSINESS_PREAMBLE` in `bot.js`. Update that constant to change business info or product listings.

Single-file bot (`bot.js`) using `node-telegram-bot-api` in polling mode. Commands are handled with `bot.onText()` and general messages with `bot.on('message')`. Non-command messages are forwarded to Cohere (`command-a-03-2025`) via `cohere-ai` with per-user chat history for context. `/clear` deletes all tracked messages from the Telegram chat and resets the AI history. All message IDs (user + bot) are tracked in `messageIds` keyed by `chatId`. Bots can only delete their own messages and user messages sent within 48 hours in private chats. Environment variables are loaded via `dotenv`.

- Entry point: `bot.js`
- Config: `.env` (not committed)
- Token source: [@BotFather](https://t.me/BotFather) on Telegram
