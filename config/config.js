require('dotenv').config();

module.exports = {
  // Telegram Bot Token
  BOT_TOKEN: process.env.BOT_TOKEN,
  
  // CoinPayments API
  COINPAYMENTS_PUBLIC_KEY: process.env.COINPAYMENTS_PUBLIC_KEY,
  COINPAYMENTS_PRIVATE_KEY: process.env.COINPAYMENTS_PRIVATE_KEY,
  COINPAYMENTS_MERCHANT_ID: process.env.COINPAYMENTS_MERCHANT_ID,
  COINPAYMENTS_IPN_SECRET: process.env.COINPAYMENTS_IPN_SECRET,
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram_payment_bot',
  
  // Admin configuration
  ADMIN_IDS: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [],
  
  // Bot Settings
  MIN_SEND_AMOUNT: 0.01,
  TRANSACTION_FEE: 0.01, // 1%
  
  // Currencies
  SUPPORTED_CURRENCIES: ['BTC', 'ETH', 'LTC', 'USDT']
};
