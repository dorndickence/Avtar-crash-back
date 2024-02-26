const user = require("../model/user");
const deposit = require("../model/deposit");
const axios = require("axios");
module.exports = {
  deposit: async function (res) {
    const allDeposit = await deposit.aggregate([
      { $match: { payment_status: "waiting" } }, // Match documents with payment_status equal to "waiting"
      { $sample: { size: 10 } }, // Sample 10 random documents
    ]);

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
        })
        .catch(function (error) {
          console.log(error);
        });
    });

    res.status(200).send("Finished");
  },
};
