const config = require('../config/config');

const isAdmin = (ctx, next) => {
  const userId = ctx.from.id.toString();
  if (config.ADMIN_IDS.includes(userId)) {
    return next();
  } else {
    ctx.reply('❌ Access denied. Admin only.');
    return;
  }
};

module.exports = {
  isAdmin
};
