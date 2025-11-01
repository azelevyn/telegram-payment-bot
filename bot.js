const { Telegraf, session } = require('telegraf');
const config = require('.configconfig');
const connectDB = require('.databasedatabase');

 Import handlers
const userHandlers = require('.handlersuserHandlers');
const adminHandlers = require('.handlersadminHandlers');
const { isAdmin } = require('.middlewareauthMiddleware');

 Initialize bot
const bot = new Telegraf(config.BOT_TOKEN);

 Use session middleware
bot.use(session());

 User command handlers
bot.start(userHandlers.startHandler);
bot.command('balance', userHandlers.balanceHandler);
bot.command('account', userHandlers.accountHandler);
bot.command('deposit', userHandlers.depositHandler);
bot.command('send', userHandlers.sendHandler);
bot.command('history', userHandlers.historyHandler);

 Admin command handlers (with admin middleware)
bot.command('admin', isAdmin, adminHandlers.adminHandler);
bot.command('admin_users', isAdmin, adminHandlers.adminUsersHandler);
bot.command('admin_balance', isAdmin, adminHandlers.adminBalanceHandler);
bot.command('admin_add', isAdmin, adminHandlers.adminAddHandler);
bot.command('admin_deduct', isAdmin, adminHandlers.adminDeductHandler);
bot.command('admin_stats', isAdmin, adminHandlers.adminStatsHandler);

 Callback query handlers
bot.action(^deposit_, userHandlers.handleDepositCallback);
bot.action(^admin_, isAdmin, adminHandlers.handleAdminCallback);

 Message handler for custom deposit amount
bot.on('text', userHandlers.handleCustomDeposit);

 Error handling
bot.catch((err, ctx) = {
  console.error(`Error for ${ctx.updateType}`, err);
  ctx.reply('❌ An error occurred. Please try again.');
});

 Start function
const startBot = async () = {
  try {
     Connect to database
    await connectDB();
    
     Start bot
    await bot.launch();
    console.log('🤖 Telegram bot is running...');
    
     Enable graceful stop
    process.once('SIGINT', () = bot.stop('SIGINT'));
    process.once('SIGTERM', () = bot.stop('SIGTERM'));
    
  } catch (error) {
    console.error('Failed to start bot', error);
    process.exit(1);
  }
};

startBot();

module.exports = bot;
