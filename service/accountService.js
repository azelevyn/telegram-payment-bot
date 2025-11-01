const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Deposit = require('../models/Deposit');
const config = require('../config/config');

class AccountService {
  async createOrUpdateUser(telegramUser) {
    let user = await User.findOne({ telegramId: telegramUser.id.toString() });
    
    if (!user) {
      user = new User({
        telegramId: telegramUser.id.toString(),
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        isAdmin: config.ADMIN_IDS.includes(telegramUser.id.toString())
      });
      await user.save();
    } else {
      // Update user info
      user.username = telegramUser.username;
      user.firstName = telegramUser.first_name;
      user.lastName = telegramUser.last_name;
      user.lastActivity = new Date();
      await user.save();
    }
    
    return user;
  }

  async getUserBalance(telegramId) {
    const user = await User.findOne({ telegramId: telegramId.toString() });
    return user ? user.balance : null;
  }

  async transferMoney(fromUserId, toAccountNumber, amount, description = '') {
    const session = await User.startSession();
    session.startTransaction();

    try {
      const fromUser = await User.findOne({ telegramId: fromUserId.toString() }).session(session);
      const toUser = await User.findOne({ accountNumber: toAccountNumber }).session(session);

      if (!fromUser) {
        throw new Error('Sender not found');
      }

      if (!toUser) {
        throw new Error('Recipient account not found');
      }

      if (fromUser.accountNumber === toAccountNumber) {
        throw new Error('Cannot send money to yourself');
      }

      const fee = amount * config.TRANSACTION_FEE;
      const totalAmount = amount + fee;

      if (fromUser.balance < totalAmount) {
        throw new Error(`Insufficient balance. Need $${totalAmount.toFixed(2)} (including ${(config.TRANSACTION_FEE * 100)}% fee)`);
      }

      // Update balances
      fromUser.balance -= totalAmount;
      toUser.balance += amount;

      await fromUser.save({ session });
      await toUser.save({ session });

      // Create transaction record
      const transaction = new Transaction({
        fromUserId: fromUser.telegramId,
        toUserId: toUser.telegramId,
        amount: amount,
        fee: fee,
        status: 'completed',
        type: 'send',
        description: description,
        completedAt: new Date()
      });

      await transaction.save({ session });

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        transaction,
        fromUser,
        toUser,
        fee
      };

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, error: error.message };
    }
  }

  async adminUpdateBalance(userIdentifier, amount, type, adminId, description = '') {
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Find user by account number or telegram ID
      const user = await User.findOne({
        $or: [
          { accountNumber: userIdentifier },
          { telegramId: userIdentifier }
        ]
      }).session(session);

      if (!user) {
        throw new Error('User not found');
      }

      const oldBalance = user.balance;

      if (type === 'add') {
        user.balance += amount;
      } else if (type === 'deduct') {
        if (user.balance < amount) {
          throw new Error('Insufficient balance to deduct');
        }
        user.balance -= amount;
      }

      await user.save({ session });

      // Create admin transaction record
      const transaction = new Transaction({
        fromUserId: type === 'add' ? 'admin' : user.telegramId,
        toUserId: type === 'add' ? user.telegramId : 'admin',
        amount: amount,
        status: 'completed',
        type: type === 'add' ? 'admin_add' : 'admin_deduct',
        description: `${description} (by admin: ${adminId})`,
        completedAt: new Date()
      });

      await transaction.save({ session });

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        user,
        oldBalance,
        newBalance: user.balance,
        transaction
      };

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, error: error.message };
    }
  }

  async getTransactionHistory(telegramId, limit = 10) {
    return await Transaction.find({
      $or: [
        { fromUserId: telegramId },
        { toUserId: telegramId }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
  }

  async getAllUsers(limit = 50, page = 1) {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      User.countDocuments()
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getSystemStats() {
    const totalUsers = await User.countDocuments();
    const totalBalance = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]);
    const totalTransactions = await Transaction.countDocuments();
    const pendingDeposits = await Deposit.countDocuments({ status: 'pending' });

    return {
      totalUsers,
      totalBalance: totalBalance[0]?.total || 0,
      totalTransactions,
      pendingDeposits
    };
  }
}

module.exports = new AccountService();
