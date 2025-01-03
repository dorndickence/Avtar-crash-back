const user = require("../model/user");
const withdraw = require("../model/withdraw");
const crypto = require("crypto");
require("dotenv").config();

module.exports = {
  withdraw: async function (req) {
    try {
      const hmac = crypto.createHmac("sha512", process.env.NOW_IPN);
      hmac.update(JSON.stringify(this.sortObject(req.body)));
      const signature = hmac.digest("hex");

      // Verify the signature
      if (signature === req.headers["x-nowpayments-sig"]) {
        const data = req.body;
        const getWithdrawal = await withdraw.findOne({ payout_id: data.id });

        if (!getWithdrawal) {
          throw new Error("Withdrawal record not found");
        }

        // Update withdrawal status based on payment response
        if (data.status === "FINISHED") {
          await withdraw.findByIdAndUpdate(getWithdrawal._id, {
            status: "finished",
          });
        } else if (
          getWithdrawal.status !== "failed" &&
          (data.status === "FAILED" || data.status === "REJECTED")
        ) {
          // Refund the user's balance
          await user.findByIdAndUpdate(getWithdrawal.user_id, {
            $inc: {
              [`balance.${getWithdrawal.payout_currency}`]: getWithdrawal.amount,
            },
          });

          await withdraw.findByIdAndUpdate(getWithdrawal._id, {
            status: "failed",
          });
        }
      } else {
        console.error("Signature mismatch");
      }
    } catch (error) {
      console.error("Error processing withdrawal:", error);
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