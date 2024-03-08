const user = require("../model/user");
const withdraw = require("../model/withdraw");
const crypto = require("crypto");

require("dotenv").config();
//ooyzahNyYpT97hR6otAHG1tpu2Czuh2j
module.exports = {
  withdraw: async function (req) {
    const hmac = crypto.createHmac("sha512", process.env.NOW_IPN);
    hmac.update(JSON.stringify(this.sortObject(req.body)));
    const signature = hmac.digest("hex");

    if (signature === req.headers["x-nowpayments-sig"]) {
      const data = req.body;
      const getDeposit = await withdraw.find({ payout_id: data.id });
      if (data.status === "FINISHED") {
        await withdraw.findByIdAndUpdate(getDeposit[0]._id, {
          status: "finished",
        });
      }

      if (data.status === "FAILED" || data.status === "REJECTED") {
        await user.findByIdAndUpdate(getDeposit[0].user_id, {
          $inc: {
            [`balance.${getDeposit[0].payout_currency}`]: parseFloat(
              getDeposit[0].amount
            ),
          },
        });

        await withdraw.findByIdAndUpdate(getDeposit[0]._id, {
          status: "failed",
        });
      }
    }
  },
  sortObject: function (obj) {
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] =
          obj[key] && typeof obj[key] === "object"
            ? this.sortObject(obj[key])
            : obj[key];
        return result;
      }, {});
  },
};
