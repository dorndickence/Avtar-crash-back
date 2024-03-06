const { mongoose } = require("mongoose");
const partnerWithdrawModel = mongoose.Schema({
  status: { type: String, required: true },
  partnerId: { type: String, reuquired: true },
  account: { type: String, reuquired: true },
  amount: {
    type: mongoose.Types.Decimal128,
    required: true,
  },
  payoutCurrency: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, required: false },
  updatedAt: { type: Date, default: Date.now, required: false },
});

const partnerWithdraw = mongoose.model("partnerWithdraw", partnerWithdrawModel);
module.exports = partnerWithdraw;
