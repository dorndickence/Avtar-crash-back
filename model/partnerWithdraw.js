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
  payout_id: { type: String, required: false, default: null },
  createdAt: { type: Date, default: Date.now, required: false },
  updatedAt: { type: Date, default: Date.now, required: false },
});

const partnerWithdraw = mongoose.model("partnerWithdraw", partnerWithdrawModel);
module.exports = partnerWithdraw;
