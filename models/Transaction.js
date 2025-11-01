const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  txId: {
    type: String,
    unique: true,
    sparse: true
  },
  fromUserId: {
    type: String,
    required: true
  },
  toUserId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  type: {
    type: String,
    enum: ['send', 'receive', 'deposit', 'withdrawal', 'admin_add', 'admin_deduct'],
    required: true
  },
  fee: {
    type: Number,
    default: 0
  },
  description: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
