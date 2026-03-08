require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { CohereClient } = require('cohere-ai');

const token = process.env.BOT_TOKEN;
const cohereKey = process.env.COHERE_API_KEY;

if (!token) {
  console.error('Error: BOT_TOKEN is not set in .env file');
  process.exit(1);
}
if (!cohereKey) {
  console.error('Error: COHERE_API_KEY is not set in .env file');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const cohere = new CohereClient({ token: cohereKey });

const BUSINESS_PREAMBLE = `You are a helpful sales assistant for "ZPH Mobile Shop", a mobile phone shop in Yangon, Myanmar.
Business hours: Mon–Sun, 9am–8pm.
Location: No. 45, Pyay Road, Yangon.
Contact: +95 9123456789

Available phones and prices (in MMK):

iPhone:
- iPhone 16 Pro Max (256GB): 3,200,000 MMK
- iPhone 16 Pro (128GB): 2,800,000 MMK
- iPhone 15 (128GB): 2,000,000 MMK
- iPhone 14 (128GB): 1,600,000 MMK

Samsung:
- Samsung Galaxy S25 Ultra: 3,500,000 MMK
- Samsung Galaxy S25: 2,500,000 MMK
- Samsung Galaxy A55: 900,000 MMK
- Samsung Galaxy A35: 700,000 MMK

Xiaomi:
- Xiaomi 14T Pro: 1,400,000 MMK
- Xiaomi 14T: 1,000,000 MMK
- Redmi Note 13 Pro: 600,000 MMK
- Redmi 13C: 280,000 MMK

OPPO:
- OPPO Reno 12 Pro: 900,000 MMK
- OPPO Reno 12: 700,000 MMK
- OPPO A3 Pro: 450,000 MMK

All phones come with a 1-year warranty. We also offer screen protectors, cases, and repair services.
Answer questions about products, prices, availability, and shop info. If asked something unrelated, politely say you can only help with phone shop questions.`;

// Store chat history per user: { [chatId]: [ { role, message } ] }
const chatHistories = {};
// Track all message IDs per chat for deletion: { [chatId]: [messageId] }
const messageIds = {};

function trackMessage(chatId, messageId) {
  if (!messageIds[chatId]) messageIds[chatId] = [];
  messageIds[chatId].push(messageId);
}

console.log('Bot is running...');

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'there';
  trackMessage(chatId, msg.message_id);
  const sent = await bot.sendMessage(chatId, `Welcome, ${firstName}! 👋 How can I help you?`);
  trackMessage(chatId, sent.message_id);
});

bot.onText(/\/clear/, async (msg) => {
  const chatId = msg.chat.id;

  // Delete all tracked messages
  const ids = messageIds[chatId] || [];
  // Also include the /clear message itself
  ids.push(msg.message_id);

  for (const id of ids) {
    try {
      await bot.deleteMessage(chatId, id);
    } catch (_) {
      // Ignore errors (message too old or already deleted)
    }
  }

  // Reset history and message tracking
  chatHistories[chatId] = [];
  messageIds[chatId] = [];
});

bot.on('message', async (msg) => {
  if (msg.text && msg.text.startsWith('/')) return;
  const chatId = msg.chat.id;
  const userText = msg.text;

  if (!userText) return;

  trackMessage(chatId, msg.message_id);

  if (!chatHistories[chatId]) chatHistories[chatId] = [];

  try {
    const response = await cohere.chat({
      model: 'command-a-03-2025',
      message: userText,
      chatHistory: chatHistories[chatId],
      preamble: BUSINESS_PREAMBLE,
    });

    const reply = response.text;

    chatHistories[chatId].push({ role: 'USER', message: userText });
    chatHistories[chatId].push({ role: 'CHATBOT', message: reply });

    const sent = await bot.sendMessage(chatId, reply);
    trackMessage(chatId, sent.message_id);
  } catch (err) {
    console.error('Cohere error:', err.message);
    if (err.message.includes('429') || err.message.includes('quota') || err.message.includes('rate')) {
      bot.sendMessage(chatId, 'Too many requests. Please wait a moment and try again.');
    } else {
      bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
    }
  }
});
