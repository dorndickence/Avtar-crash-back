const user = require("../model/user");
const deposit = require("../model/deposit");
const crypto = require("crypto");
const { mongoose } = require("mongoose");
require("dotenv").config();
//ooyzahNyYpT97hR6otAHG1tpu2Czuh2j
module.exports = {
  deposit: async function (req) {
    const hmac = crypto.createHmac("sha512", process.env.NOW_IPN);
    hmac.update(JSON.stringify(this.sortObject(req.body)));
    const signature = hmac.digest("hex");

    if (signature === req.headers["x-nowpayments-sig"]) {
      const data = req.body;
      const getDeposit = await deposit.find({ payment_id: data.payment_id });
      if (
        data.payment_status === "finished" &&
        getDeposit[0].payment_status !== "finished"
      ) {
        const actuallyPaidDecimal = mongoose.Types.Decimal128.fromString(
          data.actually_paid
        );
        await user.findByIdAndUpdate(getDeposit[0].user_id, {
          $inc: {
            [`balance.${getDeposit[0].pay_currency}`]: actuallyPaidDecimal,
          },
        });
        await deposit.findByIdAndUpdate(getDeposit[0]._id, {
          payment_status: data.payment_status,
          pay_amount: data.actually_paid,
        });
      }

      if (
        data.payment_status === "refunded" ||
        data.payment_status === "failed" ||
        data.payment_status === "expired"
      ) {
        await deposit.findByIdAndUpdate(getDeposit[0]._id, {
          payment_status: "failed",
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
