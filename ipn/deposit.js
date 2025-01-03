const user = require("../model/user");
const deposit = require("../model/deposit");
const crypto = require("crypto");
const { mongoose } = require("mongoose");
require("dotenv").config();

module.exports = {
  deposit: async function (req) {
    try {
      const hmac = crypto.createHmac("sha512", process.env.NOW_IPN);
      hmac.update(JSON.stringify(this.sortObject(req.body)));
      const signature = hmac.digest("hex");

      // Verify the signature
      if (signature === req.headers["x-nowpayments-sig"]) {
        const data = req.body;
        const getDeposit = await deposit.find({ payment_id: data.payment_id });

        // Check payment status and update accordingly
        if (data.payment_status === "finished" && getDeposit.length > 0 && getDeposit[0].payment_status !== "finished") {
          const actuallyPaidDecimal = mongoose.Types.Decimal128.fromString(
            parseFloat(data.actually_paid).toString()
          );

          // Update user balance
          await user.findByIdAndUpdate(getDeposit[0].user_id, {
            $inc: {
              [`balance.${getDeposit[0].pay_currency}`]: actuallyPaidDecimal,
            },
          });

          // Update deposit record
          await deposit.findByIdAndUpdate(getDeposit[0]._id, {
            payment_status: data.payment_status,
            pay_amount: data.actually_paid,
          });
        }

        // Handle failed or refunded payments
        if (["refunded", "failed", "expired"].includes(data.payment_status)) {
          await deposit.findByIdAndUpdate(getDeposit[0]._id, {
            payment_status: "failed",
          });
        }
      }
    } catch (error) {
      console.error("Error processing deposit:", error);
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