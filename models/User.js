const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    sparse: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String
  },
  accountNumber: {
    type: String,
    unique: true,
    index: true
  },
  balance: {
    type: Number,
    default: 0.0
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
});

// Generate account number before saving
userSchema.pre('save', function(next) {
  if (!this.accountNumber) {
    this.accountNumber = this.generateAccountNumber();
  }
  next();
});

// Method to generate IBAN-like account number
userSchema.methods.generateAccountNumber = function() {
  const crypto = require('crypto');
  const seed = `${this.telegramId}${Date.now()}`;
  const hash = crypto.createHash('md5').update(seed).digest('hex').toUpperCase();
  return `TB${hash.substring(0, 18)}`;
};

// Update last activity
userSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
