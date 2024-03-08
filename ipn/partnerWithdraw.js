const partnerWithdraw = require("../model/partnerWithdraw");
const partner = require("../model/partner");
const crypto = require("crypto");

require("dotenv").config();
//ooyzahNyYpT97hR6otAHG1tpu2Czuh2j
module.exports = {
  partnerWithdraw: async function (req) {
    const hmac = crypto.createHmac("sha512", process.env.NOW_IPN);
    hmac.update(JSON.stringify(this.sortObject(req.body)));
    const signature = hmac.digest("hex");

    if (signature === req.headers["x-nowpayments-sig"]) {
      const data = req.body;
      const getDeposit = await partnerWithdraw.find({ payout_id: data.id });
      if (data.status === "FINISHED") {
        await partnerWithdraw.findByIdAndUpdate(getDeposit[0]._id, {
          status: "finished",
        });
      }

      if (data.status === "FAILED" || data.status === "REJECTED") {
        await partner.findByIdAndUpdate(getDeposit[0].partnerId, {
          $inc: {
            [`balance.${getDeposit[0].payoutCurrency}`]: parseFloat(
              getDeposit[0].amount
            ),
          },
        });

        await partnerWithdraw.findByIdAndUpdate(getDeposit[0]._id, {
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
