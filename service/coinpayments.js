const crypto = require('crypto');
const axios = require('axios');
const querystring = require('querystring');
const config = require('../config/config');

class CoinPaymentsService {
  constructor() {
    this.publicKey = config.COINPAYMENTS_PUBLIC_KEY;
    this.privateKey = config.COINPAYMENTS_PRIVATE_KEY;
    this.merchantId = config.COINPAYMENTS_MERCHANT_ID;
    this.ipnSecret = config.COINPAYMENTS_IPN_SECRET;
    this.baseUrl = 'https://www.coinpayments.net/api.php';
  }

  createHmac(payload) {
    const encodedPayload = querystring.stringify(payload);
    return crypto
      .createHmac('sha512', this.privateKey)
      .update(encodedPayload)
      .digest('hex');
  }

  async createTransaction(amount, currency = 'BTC', buyerEmail = '', itemName = 'Deposit') {
    const payload = {
      cmd: 'create_transaction',
      version: 1,
      key: this.publicKey,
      amount: amount,
      currency1: 'USD',
      currency2: currency,
      buyer_email: buyerEmail,
      item_name: itemName,
      merchant: this.merchantId,
      ipn_url: `${process.env.BASE_URL}/ipn` // Update with your domain
    };

    const headers = {
      HMAC: this.createHmac(payload),
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    try {
      const response = await axios.post(this.baseUrl, querystring.stringify(payload), { headers });
      const result = response.data;

      if (result.error === 'ok') {
        return {
          success: true,
          amount: result.result.amount,
          address: result.result.address,
          txnId: result.result.txn_id,
          timeout: result.result.timeout,
          checkoutUrl: result.result.status_url,
          currency: currency
        };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getTransactionInfo(txId) {
    const payload = {
      cmd: 'get_tx_info',
      version: 1,
      key: this.publicKey,
      txid: txId
    };

    const headers = {
      HMAC: this.createHmac(payload),
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    try {
      const response = await axios.post(this.baseUrl, querystring.stringify(payload), { headers });
      return response.data;
    } catch (error) {
      return { error: error.message };
    }
  }

  verifyIpn(postData, hmacHeader) {
    // Sort the POST values alphabetically
    const sortedKeys = Object.keys(postData).sort();
    const sortedData = {};
    sortedKeys.forEach(key => {
      sortedData[key] = postData[key];
    });

    const encodedData = querystring.stringify(sortedData);
    const calculatedHmac = crypto
      .createHmac('sha512', this.ipnSecret)
      .update(encodedData)
      .digest('hex');

    return calculatedHmac === hmacHeader;
  }
}

module.exports = new CoinPaymentsService();
