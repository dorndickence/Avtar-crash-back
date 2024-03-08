const { mongoose } = require("mongoose");
const withdrawModel = mongoose.Schema({
  status: { type: String, required: true },
  user_id: { type: String, reuquired: true },
  account: { type: String, reuquired: true },
  amount: {
    type: mongoose.Types.Decimal128,
    required: true,
  },
  payout_currency: { type: String, required: true },
  payout_id: { type: String, required: false, default: null },
  createdAt: { type: Date, default: Date.now, required: false },
  updatedAt: { type: Date, default: Date.now, required: false },
});

const withdraw = mongoose.model("withdraw", withdrawModel);
module.exports = withdraw;
