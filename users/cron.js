const user = require("../model/user");
const deposit = require("../model/deposit");
const cryptoPrice = require("../model/cryptoPrice");
const axios = require("axios");
require("dotenv").config();
module.exports = {
  deposit: async function (res) {
    const allDeposit = await deposit.aggregate([
      { $match: { payment_status: "waiting" } }, // Match documents with payment_status equal to "waiting"
      { $sample: { size: 10 } }, // Sample 10 random documents
    ]);

    const counter = 0;

    await allDeposit.forEach((deposit) => {
      const config = {
        method: "get",
        maxBodyLength: Infinity,
        url: `https://api.nowpayments.io/v1/payment/${deposit.payment_id}`,
        headers: {
          "x-api-key": "SX7W75F-J76MBF5-PDY3E6P-NRWCNKJ",
        },
      };

      axios(config)
        .then(async (response) => {
          const data = response.data;
          if (data.payment_status === "finished") {
            await user.findByIdAndUpdate(deposit.user_id, {
              $inc: {
                [`balance.${deposit.pay_currency}`]: data.actually_paid,
              },
            });
            await user.findByIdAndUpdate(deposit._id, {
              payment_status: data.payment_status,
            });
          } else {
            await user.findByIdAndUpdate(deposit._id, {
              payment_status: data.payment_status,
            });
          }

          counter++;
        })
        .catch(function (error) {
          console.log(error);
        });
    });

    if (counter === 10) {
      setTimeout(this.deposit, 300000);
    } else {
      console.log("Could not run the payment checkout cron successfully");
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

        timer -= timerIncreaseValue;
        if (timer === 0) {
          this.cryptoPrice();
        }
      }, timer);

      timer += timerIncreaseValue;
    });
  },
};
