const { mongoose } = require("mongoose");
const roundModel = mongoose.Schema({
  hash: { type: String, reuquired: true },
  amount: {
    type: mongoose.Types.Decimal128,
    required: true,
  },
  amountInUSD: {
    type: mongoose.Types.Decimal128,
    default: "0",
    required: false,
  },
  publicUsername: { type: String, required: true },
  privateUsername: { type: String, required: true },
  currency: { type: String, required: true },
  win: {
    type: mongoose.Types.Decimal128,
    default: "0",
    required: false,
  },
  winInUSD: {
    type: mongoose.Types.Decimal128,
    default: "0",
    required: false,
  },
  odds: {
    type: mongoose.Types.Decimal128,
    default: "0",
    required: false,
  },
  crash: {
    type: mongoose.Types.Decimal128,
    default: "0",
    required: false,
  },
  createdAt: { type: Date, default: Date.now, required: false },
});

const round = mongoose.model("round", roundModel);
module.exports = round;
