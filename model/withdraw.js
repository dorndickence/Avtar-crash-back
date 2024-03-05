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
  createdAt: { type: Date, default: new Date(), required: false },
  updatedAt: { type: Date, default: new Date(), required: false },
});

const withdraw = mongoose.model("withdraw", withdrawModel);
module.exports = withdraw;