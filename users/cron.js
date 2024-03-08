const user = require("../model/user");
const deposit = require("../model/deposit");
const withdraw = require("../model/withdraw");
const partnerWithdraw = require("../model/partnerWithdraw");
const cryptoPrice = require("../model/cryptoPrice");
const partner = require("../model/partner");
const axios = require("axios");
require("dotenv").config();
module.exports = {
  withdraw: async function () {
    try {
      const allDeposit = await withdraw.aggregate([
        { $match: { status: "Processing" } }, // Match documents with payment_status equal to "waiting"
        { $sample: { size: 10 } }, // Sample 10 random documents
      ]);

      let counter = 0;

      await Promise.all(
        allDeposit.map(async (deposit) => {
          const config = {
            method: "get",
            maxBodyLength: Infinity,
            url: `https://api.nowpayments.io/v1/payout/${deposit.payout_id}`,
            headers: {
              "x-api-key": process.env.NOW_API,
            },
          };

          const response = await axios(config);

          const data = response.data;
          if (data.status === "FINISHED") {
            await withdraw.findByIdAndUpdate(deposit._id, {
              status: "finished",
            });
          }

          if (data.status === "FAILED" || data.status === "REJECTED") {
            await user.findByIdAndUpdate(deposit.user_id, {
              $inc: {
                [`balance.${deposit.payout_currency}`]: parseFloat(
                  deposit.amount
                ),
              },
            });

            await withdraw.findByIdAndUpdate(deposit._id, {
              status: "failed",
            });
          }

          counter++;
        })
      );

      if (counter !== 0) {
        console.log("checking in 5 minutes :)");
        setTimeout(() => {
          this.withdraw();
        }, 300000);
      } else {
        console.log("All Withdraw Clear :)");
      }
    } catch (error) {
      console.log(error);
    }
  },
  partnerWithdraw: async function () {
    try {
      const allDeposit = await partnerWithdraw.aggregate([
        { $match: { status: "Processing" } }, // Match documents with payment_status equal to "waiting"
        { $sample: { size: 10 } }, // Sample 10 random documents
      ]);

      let counter = 0;

      await Promise.all(
        allDeposit.map(async (deposit) => {
          const config = {
            method: "get",
            maxBodyLength: Infinity,
            url: `https://api.nowpayments.io/v1/payout/${deposit.payout_id}`,
            headers: {
              "x-api-key": process.env.NOW_API,
            },
          };

          const response = await axios(config);
          const data = response.data.withdrawals[0];
          if (data.status === "FINISHED") {
            await partnerWithdraw.findByIdAndUpdate(deposit._id, {
              status: "finished",
            });
          }

          if (data.status === "FAILED" || data.status === "REJECTED") {
            await partner.findByIdAndUpdate(deposit.partnerId, {
              $inc: {
                [`balance.${deposit.payoutCurrency}`]: parseFloat(
                  deposit.amount
                ),
              },
            });
            const ope = await partnerWithdraw.findByIdAndUpdate(deposit._id, {
              status: "failed",
            });
          }

          counter++;
        })
      );

      if (counter !== 0) {
        console.log("checking in 5 minutes :)");
        setTimeout(() => {
          this.partnerWithdraw();
        }, 300000);
      } else {
        console.log("All Partner Withdraw Clear :)");
      }
    } catch (error) {
      console.log(error);
    }
  },
  deposit: async function () {
    try {
      const allDeposit = await deposit.aggregate([
        { $match: { payment_status: "waiting" } }, // Match documents with payment_status equal to "waiting"
        { $sample: { size: 10 } }, // Sample 10 random documents
      ]);

      let counter = 0;

      await Promise.all(
        allDeposit.map(async (depositData) => {
          const config = {
            method: "get",
            maxBodyLength: Infinity,
            url: `https://api.nowpayments.io/v1/payment/${depositData.payment_id}`,
            headers: {
              "x-api-key": process.env.NOW_API,
            },
          };

          const response = await axios(config);

          const data = response.data;
          if (data.payment_status === "finished") {
            await deposit.findByIdAndUpdate(depositData.user_id, {
              $inc: {
                [`balance.${depositData.pay_currency}`]: parseFloat(
                  data.actually_paid
                ),
              },
            });
            await deposit.findByIdAndUpdate(depositData._id, {
              payment_status: data.payment_status,
              pay_amount: data.actually_paid,
            });
          }

          if (
            data.payment_status === "refunded" ||
            data.payment_status === "failed" ||
            data.payment_status === "expired"
          ) {
            await deposit.findByIdAndUpdate(depositData._id, {
              payment_status: "failed",
            });
          }

          counter++;
        })
      );

      if (counter !== 0) {
        console.log("checking deposit in 5 minutes :)");
        setTimeout(() => {
          this.deposit();
        }, 300000);
      } else {
        console.log("All Deposit Clear :)");
      }
    } catch (error) {
      console.log(error);
    }
  },

  cryptoPrice: async function () {
    const currency = ["usdttrc20", "trx", "dai", "sol"];
    let timer = 0;
    const timerIncreaseValue = 3600000;
    currency.forEach(async (coin) => {
      const config = {
        method: "get",
        maxBodyLength: Infinity,
        url: `https://api.nowpayments.io/v1/estimate?amount=1&currency_from=${coin}&currency_to=usd`,
        headers: {
          "x-api-key": process.env.NOW_API,
        },
      };
      timer += timerIncreaseValue;
      setTimeout(async () => {
        const response = await axios(config);
        const findCoin = await cryptoPrice.find({ name: coin });
        if (findCoin.length === 0) {
          await cryptoPrice.create({
            name: coin,
            value: parseFloat(response.data.estimated_amount),
          });
        } else {
          await cryptoPrice.updateOne(
            {
              name: coin,
            },
            {
              $set: {
                value: parseFloat(response.data.estimated_amount),
                updatedAt: new Date(),
              },
            }
          );
        }
        console.log(`${coin} price updated`);

        timer -= timerIncreaseValue;

        if (timer === 0) {
          this.cryptoPrice();
        }
      }, timer);
    });
  },
};
