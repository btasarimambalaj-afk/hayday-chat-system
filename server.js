New

Share


1053 lines

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');
const TelegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;
// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
// Initialize Telegram Bot
let telegramBot;
if (process.env.NODE_ENV === 'production') {
  // Production: Webhook mode
  telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
  
  // Set webhook URL after server starts
  setTimeout(() => {
    const webhookUrl = `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/webhook/telegram`;
    telegramBot.setWebHook(webhookUrl).then(() => {
      console.log('📱 Telegram webhook set successfully');
    }).catch(err => {
      console.error('❌ Telegram webhook setup failed:', err);
    });
  }, 5000);
} else {
  // Development: Polling mode  
  telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
  console.log('📱 Telegram bot initialized with polling');
}
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID;
// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
