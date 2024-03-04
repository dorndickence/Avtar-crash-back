const user = require("../model/user");
const axios = require("axios");
const deposit = require("../model/deposit");
const withdraw = require("../model/withdraw");
module.exports = {
  depositCheck: async function (req, res) {
    if (req.body.token === undefined) {
      res.status(400).send({
        message: "Token is required",
        success: false,
        data: {},
      });
      return;
    }
    if (req.body.depositId === undefined) {
      res.status(400).send({
        message: "Deposit ID is required",
        success: false,
        data: {},
      });
      return;
    }
    const token = req.body.token;
    const depositId = req.body.depositId;
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
        message: `Please login to check deposit`,
        success: false,
        data: {},
      });
      return;
    }

    const userDeposit = await deposit.find({
      _id: depositId,
    });

    if (userDeposit.length === 0) {
      res.status(401).send({
        message: `No deposit found`,
        success: false,
        data: {},
      });
      return;
    }

    await userDeposit.forEach((depositArg) => {
      const config = {
        method: "get",
        maxBodyLength: Infinity,
        url: `https://api.nowpayments.io/v1/payment/${depositArg.payment_id}`,
        headers: {
          "x-api-key": "SX7W75F-J76MBF5-PDY3E6P-NRWCNKJ",
        },
      };

      axios(config)
        .then(async (response) => {
          const data = response.data;
          if (data.payment_status === "finished") {
            await user.findByIdAndUpdate(depositArg.user_id, {
              $inc: {
                [`balance.${depositArg.pay_currency}`]: data.actually_paid,
              },
            });
            await user.findByIdAndUpdate(depositArg._id, {
              payment_status: data.payment_status,
            });
            res.status(200).send({
              message: `Deposit Credited`,
              success: true,
              data: {},
            });
          } else {
            await user.findByIdAndUpdate(depositArg._id, {
              payment_status: data.payment_status,
            });

            res.status(202).send({
              message: `Deposit Not credited`,
              success: true,
              data: data.payment_status,
            });
          }
        })
        .catch(function (error) {
          console.log(error);
        });
    });
  },
  withdraw: async function (req, res) {
    if (req.body.token === undefined) {
      res.status(400).send({
        message: "Token is required",
        success: false,
        data: {},
      });
      return;
    }
    if (req.body.amount === undefined) {
      res.status(400).send({
        message: "amount is required",
        success: false,
        data: {},
      });
      return;
    }

    if (req.body.coin === undefined) {
      res.status(400).send({
        message: "amount is required",
        success: false,
        data: {},
      });
      return;
    }

    if (req.body.account === undefined) {
      res.status(400).send({
        message: "Payout account is required",
        success: false,
        data: {},
      });
      return;
    }

    const token = req.body.token;
    const coin = req.body.coin;
    const amount = parseFloat(req.body.amount);
    const account = req.body.account;
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
        message: `Please login to withdraw`,
        success: false,
        data: {},
      });
      return;
    }

    const balance = getUser[0].balance[coin];

    if (balance === undefined) {
      res.status(409).send({
        message: `Withdraw is allowed at the same method used to deposit.`,
        success: false,
        data: {},
      });
      return;
    }
    if (balance < amount) {
      res.status(409).send({
        message: `You do not have enough funds in your desired wallet.`,
        success: false,
        data: {},
      });
      return;
    }

    if (isNaN(amount)) {
      res.status(409).send({
        message: `Type Number.`,
        success: false,
        data: {},
      });
      return;
    }

    // check for previous withdraw request

    const getUserWithdraw = await withdraw.find({
      $and: [{ user_id: getUser[0]._id }, { status: "In Progress" }],
    });

    if (getUserWithdraw.length > 0) {
      res.status(409).send({
        message: `You already have withdraw in progress.`,
        success: false,
        data: {},
      });
      return;
    }

    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `https://api.nowpayments.io/v1/payout-withdrawal/min-amount/${coin}`,
      headers: {
        "x-api-key": "SX7W75F-J76MBF5-PDY3E6P-NRWCNKJ",
      },
    };

    axios(config)
      .then(async (response) => {
        if (response.data.result > amount) {
          res.status(409).send({
            message: `Minimum amount ${response.data.result}.`,
            success: false,
            data: {},
          });
          return;
        }
        await user.findByIdAndUpdate(getUser[0]._id, {
          $inc: {
            [`balance.${coin}`]: -amount,
          },
        });
        await withdraw.create({
          status: "In Progress",
          user_id: getUser[0]._id,
          payout_currency: coin,
          amount: amount,
          account: account,
        });

        res.status(200).send({
          data: {},
          message: `Withdraw request accepted`,
          success: true,
        });
      })
      .catch((error) => {
        res.status(404).send({
          data: {},
          message: `Try again later`,
          success: false,
        });
      });
  },
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

      // await user.findByIdAndUpdate(getUser[0]._id, {
      //   $inc: {
      //     [`balance.${coin}`]: parseFloat("1000.02"),
      //   },
      // });

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
          depositId: getUserDeposit[0]._id,
          minimum: parseFloat(getUserDeposit[0].minimum_amount),
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
          const minUsd = Math.round(response.data.fiat_equivalent) + 10;
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
          minimum_amount: response.data.pay_amount,
          pay_currency: response.data.pay_currency,
        };

        const createDep = await deposit.create(obj);

        res.status(200).send({
          data: response.data.pay_address,
          minimum: response.data.pay_amount,
          depositId: createDep._id,
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
