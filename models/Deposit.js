const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  address: {
    type: String
  },
  txId: {
    type: String,
    sparse: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'failed'],
    default: 'pending'
  },
  coinpaymentsTxnId: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: {
    type: Date
  }
});

module.exports = mongoose.model('Deposit', depositSchema);
