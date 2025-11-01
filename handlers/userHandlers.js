const { Markup } = require('telegraf');
const accountService = require('../services/accountService');
const coinpaymentsService = require('../services/coinpayments');
const Deposit = require('../models/Deposit');

const startHandler = async (ctx) => {
  const user = await accountService.createOrUpdateUser(ctx.from);
  
  const welcomeMessage = `
👋 Welcome to Crypto Payment Bot, ${user.firstName}!

💼 Your Account Number: \`${user.accountNumber}\`
💰 Your Balance: $${user.balance.toFixed(2)}

📋 Available Commands:
/balance - Check your balance
/deposit - Deposit funds
/send - Send money to another user
/account - Show your account details
/history - View transaction history

💡 To receive money, share your account number with the sender.
  `;

  await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
};

const balanceHandler = async (ctx) => {
  const user = await accountService.createOrUpdateUser(ctx.from);
  
  const message = `
💰 Your Balance

Account: \`${user.accountNumber}\`
Balance: $${user.balance.toFixed(2)}

Use /deposit to add funds or /send to transfer money.
  `;

  await ctx.reply(message, { parse_mode: 'Markdown' });
};

const accountHandler = async (ctx) => {
  const user = await accountService.createOrUpdateUser(ctx.from);
  
  const message = `
👤 Account Details

Name: ${user.firstName} ${user.lastName || ''}
Username: @${user.username || 'N/A'}
Account Number: \`${user.accountNumber}\`
Balance: $${user.balance.toFixed(2)}

💡 Share your account number to receive payments!
  `;

  await ctx.reply(message, { parse_mode: 'Markdown' });
};

const depositHandler = async (ctx) => {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('💰 $10', 'deposit_10')],
    [Markup.button.callback('💰 $50', 'deposit_50')],
    [Markup.button.callback('💰 $100', 'deposit_100')],
    [Markup.button.callback('💵 Custom Amount', 'deposit_custom')],
  ]);

  await ctx.reply('💳 Choose deposit amount or enter custom amount:', keyboard);
};

const sendHandler = async (ctx) => {
  if (ctx.message.text.split(' ').length < 3) {
    await ctx.reply(
      '💸 Send Money\n\n' +
      'Usage: /send <account_number> <amount>\n' +
      'Example: /send TB1234567890ABCDEF 10.50\n\n' +
      '💡 Transaction fee: 1%'
    );
    return;
  }

  const [, recipientAccount, amountStr] = ctx.message.text.split(' ');
  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('❌ Please enter a valid amount.');
    return;
  }

  const result = await accountService.transferMoney(
    ctx.from.id.toString(),
    recipientAccount,
    amount
  );

  if (result.success) {
    await ctx.reply(
      `✅ Payment successful!\n\n` +
      `Sent: $${amount.toFixed(2)}\n` +
      `To: ${recipientAccount}\n` +
      `Fee: $${result.fee.toFixed(2)}\n` +
      `Total: $${(amount + result.fee).toFixed(2)}\n` +
      `New Balance: $${result.fromUser.balance.toFixed(2)}`
    );

    // Notify recipient
    try {
      await ctx.telegram.sendMessage(
        result.toUser.telegramId,
        `💰 You received $${amount.toFixed(2)} from ${result.fromUser.firstName}!\n` +
        `New Balance: $${result.toUser.balance.toFixed(2)}`
      );
    } catch (error) {
      console.log('Could not notify recipient:', error.message);
    }
  } else {
    await ctx.reply(`❌ ${result.error}`);
  }
};

const historyHandler = async (ctx) => {
  const transactions = await accountService.getTransactionHistory(ctx.from.id.toString(), 10);
  
  if (transactions.length === 0) {
    await ctx.reply('📝 No transactions found.');
    return;
  }

  let historyText = '📊 Last 10 Transactions:\n\n';
  
  transactions.forEach(tx => {
    const isSender = tx.fromUserId === ctx.from.id.toString();
    const direction = isSender ? '➡️ Sent' : '⬅️ Received';
    const amount = isSender ? `-$${tx.amount.toFixed(2)}` : `+$${tx.amount.toFixed(2)}`;
    const date = new Date(tx.createdAt).toLocaleString();
    
    historyText += `${direction} ${amount}\n`;
    historyText += `Type: ${tx.type}\n`;
    historyText += `Date: ${date}\n\n`;
  });

  await ctx.reply(historyText);
};

// Handle deposit callback queries
const handleDepositCallback = async (ctx) => {
  await ctx.answerCbQuery();
  
  const data = ctx.callbackQuery.data;
  
  if (data === 'deposit_custom') {
    await ctx.reply('💵 Please enter the amount you want to deposit (in USD):');
    ctx.session = ctx.session || {};
    ctx.session.awaitingDepositAmount = true;
    return;
  }

  const amount = parseFloat(data.split('_')[1]);
  await processDeposit(ctx, amount);
};

// Process custom deposit amount from message
const handleCustomDeposit = async (ctx) => {
  if (ctx.session && ctx.session.awaitingDepositAmount) {
    const amount = parseFloat(ctx.message.text);
    
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ Please enter a valid positive amount.');
      return;
    }

    ctx.session.awaitingDepositAmount = false;
    await processDeposit(ctx, amount);
  }
};

const processDeposit = async (ctx, amount) => {
  const result = await coinpaymentsService.createTransaction(amount, 'BTC', '', `Deposit for user ${ctx.from.id}`);
  
  if (result.success) {
    // Save deposit record
    const deposit = new Deposit({
      userId: ctx.from.id.toString(),
      amount: amount,
      currency: 'BTC',
      address: result.address,
      coinpaymentsTxnId: result.txnId
    });
    await deposit.save();

    const message = `
💰 Deposit Instructions

Amount: $${amount.toFixed(2)} USD
Cryptocurrency: BTC
Address: \`${result.address}\`

⚠️ Send exactly the equivalent of $${amount.toFixed(2)} USD in BTC to the address above.

⏰ Please complete within ${result.timeout} seconds.

🔗 [Payment Status](${result.checkoutUrl})
    `;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply(`❌ Error creating deposit: ${result.error}`);
  }
};

module.exports = {
  startHandler,
  balanceHandler,
  accountHandler,
  depositHandler,
  sendHandler,
  historyHandler,
  handleDepositCallback,
  handleCustomDeposit
};
