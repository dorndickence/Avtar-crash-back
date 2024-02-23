const user = require("../model/user");
const axios = require("axios");
const deposit = require("../model/deposit");
module.exports = {
  deposit: async function (req, res) {
    try {
      if (req.body.token === undefined) {
        res.status(400).send({
          message: "Token is required",
          success: false,
          data: {},
        });
        return;
      }

      if (req.body.coin === undefined) {
        res.status(400).send({
          message: "Coin is required",
          success: false,
          data: {},
        });
        return;
      }

      const token = req.body.token;
      const coin = req.body.coin;
      const getUser = await user.find({ password: token });

      if (getUser.length !== 1 && getUser.length !== 0) {
        res.status(409).send({
          message: `Multi user conflicts`,
          success: false,
          data: {},
        });
        return;
      }
      if (getUser.length === 0) {
        res.status(401).send({
          message: `Please login to deposit`,
          success: false,
          data: {},
        });
        return;
      }
      //check for previous deposit request
      const getUserDeposit = await deposit.find({
        $and: [
          { user_id: getUser[0]._id },
          { payment_status: "waiting" },
          { pay_currency: coin },
        ],
      });

      if (getUserDeposit.length > 0) {
        res.status(200).send({
          data: getUserDeposit[0].pay_address,
          message: `Deposit request accepted`,
          success: true,
        });
        return;
      }

      //check minimum amount

      const checkData = {
        method: "get",
        maxBodyLength: Infinity,
        url: `https://api.nowpayments.io/v1/min-amount?currency_from=${coin}&currency_to=usd&fiat_equivalent=${coin}&is_fixed_rate=False&is_fee_paid_by_user=False`,
        headers: {
          "x-api-key": "SX7W75F-J76MBF5-PDY3E6P-NRWCNKJ",
        },
      };

      axios(checkData)
        .then((response) => {
          const minUsd = Math.round(response.data.fiat_equivalent) + 5;
          this.sendResponse(coin, getUser, minUsd, res);
          return;
        })
        .catch(function (error) {
          res.status(400).send({
            data: {},
            message: `Deposit server busy`,
            success: false,
          });
          return;
        });
    } catch (error) {
      res.status(422).send({
        message: "Deposit unavailable at the moment",
        success: false,
        data: error.errors,
      });
    }
  },
  sendResponse: function (coin, getUser, minUsd, res) {
    //hero goes main function

    let data = JSON.stringify({
      price_amount: minUsd,
      price_currency: "usd",
      pay_currency: coin,
      order_id: getUser[0]._id,
      order_description: "Topup Coin",
    });

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://api.nowpayments.io/v1/payment",
      headers: {
        "x-api-key": "SX7W75F-J76MBF5-PDY3E6P-NRWCNKJ",
        "Content-Type": "application/json",
      },
      data: data,
    };

    axios(config)
      .then(async (response) => {
        const obj = {
          payment_id: response.data.payment_id,
          pay_address: response.data.pay_address,
          user_id: getUser[0]._id,
          payment_status: response.data.payment_status,
          pay_currency: response.data.pay_currency,
        };

        await deposit.create(obj);
        res.status(200).send({
          data: response.data.pay_address,
          minCrypto: this.cryptoToUsd(minUsd + 5, coin),
          message: `Deposit request accepted`,
          success: true,
        });
      })
      .catch(function (error) {
        res.status(400).send({
          data: {},
          message: error.response.data.message,
          success: false,
        });
      });
  },
  cryptoToUsd: function (amount, coin) {
    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `https://api.nowpayments.io/v1/estimate?amount=${amount}&currency_from=usd&currency_to=${coin}`,
      headers: {
        "x-api-key": "SX7W75F-J76MBF5-PDY3E6P-NRWCNKJ",
      },
    };

    axios(config)
      .then((response) => {
        return Math.round(response.data.estimated_amount);
      })
      .catch(function (error) {
        return 0;
      });
  },
};
