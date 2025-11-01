const { Markup } = require('telegraf');
const accountService = require('../services/accountService');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const adminHandler = async (ctx) => {
  const stats = await accountService.getSystemStats();
  
  const message = `
👑 Admin Panel

📊 System Statistics:
• Total Users: ${stats.totalUsers}
• Total Balance: $${stats.totalBalance.toFixed(2)}
• Total Transactions: ${stats.totalTransactions}
• Pending Deposits: ${stats.pendingDeposits}

🛠 Admin Commands:
/admin_users - View all users
/admin_balance <user> - Check user balance
/admin_add <user> <amount> - Add balance
/admin_deduct <user> <amount> - Deduct balance
/admin_stats - System statistics
  `;

  await ctx.reply(message);
};

const adminUsersHandler = async (ctx) => {
  const page = parseInt(ctx.message.text.split(' ')[1]) || 1;
  const result = await accountService.getAllUsers(10, page);
  
  let message = `👥 Users (Page ${page}/${result.totalPages})\n\n`;
  
  result.users.forEach(user => {
    message += `👤 ${user.firstName} ${user.lastName || ''}\n`;
    message += `📧 @${user.username || 'N/A'}\n`;
    message += `💳 ${user.accountNumber}\n`;
    message += `💰 $${user.balance.toFixed(2)}\n`;
    message += `🕐 ${new Date(user.createdAt).toLocaleDateString()}\n`;
    message += `---\n`;
  });

  // Add pagination buttons if needed
  const keyboard = [];
  if (page > 1) {
    keyboard.push(Markup.button.callback('⬅️ Previous', `admin_users_${page - 1}`));
  }
  if (page < result.totalPages) {
    keyboard.push(Markup.button.callback('Next ➡️', `admin_users_${page + 1}`));
  }

  if (keyboard.length > 0) {
    await ctx.reply(message, Markup.inlineKeyboard(keyboard));
  } else {
    await ctx.reply(message);
  }
};

const adminBalanceHandler = async (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) {
    await ctx.reply('Usage: /admin_balance <account_number_or_telegram_id>');
    return;
  }

  const userIdentifier = parts[1];
  const user = await User.findOne({
    $or: [
      { accountNumber: userIdentifier },
      { telegramId: userIdentifier }
    ]
  });

  if (!user) {
    await ctx.reply('❌ User not found');
    return;
  }

  const message = `
👤 User Details

Name: ${user.firstName} ${user.lastName || ''}
Username: @${user.username || 'N/A'}
Telegram ID: ${user.telegramId}
Account: ${user.accountNumber}
Balance: $${user.balance.toFixed(2)}
Joined: ${new Date(user.createdAt).toLocaleString()}
Last Active: ${new Date(user.lastActivity).toLocaleString()}
  `;

  await ctx.reply(message);
};

const adminAddHandler = async (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 3) {
    await ctx.reply('Usage: /admin_add <account_number_or_telegram_id> <amount> [description]');
    return;
  }

  const userIdentifier = parts[1];
  const amount = parseFloat(parts[2]);
  const description = parts.slice(3).join(' ') || 'Admin balance addition';

  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('❌ Please enter a valid amount');
    return;
  }

  const result = await accountService.adminUpdateBalance(
    userIdentifier,
    amount,
    'add',
    ctx.from.id.toString(),
    description
  );

  if (result.success) {
    await ctx.reply(
      `✅ Balance added successfully!\n\n` +
      `User: ${result.user.firstName} (${result.user.accountNumber})\n` +
      `Amount: +$${amount.toFixed(2)}\n` +
      `Old Balance: $${result.oldBalance.toFixed(2)}\n` +
      `New Balance: $${result.newBalance.toFixed(2)}\n` +
      `Description: ${description}`
    );
  } else {
    await ctx.reply(`❌ Error: ${result.error}`);
  }
};

const adminDeductHandler = async (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length < 3) {
    await ctx.reply('Usage: /admin_deduct <account_number_or_telegram_id> <amount> [description]');
    return;
  }

  const userIdentifier = parts[1];
  const amount = parseFloat(parts[2]);
  const description = parts.slice(3).join(' ') || 'Admin balance deduction';

  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('❌ Please enter a valid amount');
    return;
  }

  const result = await accountService.adminUpdateBalance(
    userIdentifier,
    amount,
    'deduct',
    ctx.from.id.toString(),
    description
  );

  if (result.success) {
    await ctx.reply(
      `✅ Balance deducted successfully!\n\n` +
      `User: ${result.user.firstName} (${result.user.accountNumber})\n` +
      `Amount: -$${amount.toFixed(2)}\n` +
      `Old Balance: $${result.oldBalance.toFixed(2)}\n` +
      `New Balance: $${result.newBalance.toFixed(2)}\n` +
      `Description: ${description}`
    );
  } else {
    await ctx.reply(`❌ Error: ${result.error}`);
  }
};

const adminStatsHandler = async (ctx) => {
  const stats = await accountService.getSystemStats();
  
  // Get recent transactions
  const recentTransactions = await Transaction.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('fromUserId', 'firstName accountNumber')
    .populate('toUserId', 'firstName accountNumber');

  let message = `
📊 System Statistics

👥 Total Users: ${stats.totalUsers}
💰 Total Balance: $${stats.totalBalance.toFixed(2)}
📈 Total Transactions: ${stats.totalTransactions}
⏳ Pending Deposits: ${stats.pendingDeposits}

🔄 Recent Transactions:
`;

  recentTransactions.forEach(tx => {
    const fromUser = tx.fromUserId?.firstName || 'System';
    const toUser = tx.toUserId?.firstName || 'System';
    message += `• ${fromUser} → ${toUser}: $${tx.amount.toFixed(2)} (${tx.type})\n`;
  });

  await ctx.reply(message);
};

// Handle admin callback queries
const handleAdminCallback = async (ctx) => {
  await ctx.answerCbQuery();
  const data = ctx.callbackQuery.data;

  if (data.startsWith('admin_users_')) {
    const page = parseInt(data.split('_')[2]);
    // You can implement pagination callback handling here
  }
};

module.exports = {
  adminHandler,
  adminUsersHandler,
  adminBalanceHandler,
  adminAddHandler,
  adminDeductHandler,
  adminStatsHandler,
  handleAdminCallback
};
