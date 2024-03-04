const { mongoose } = require("mongoose");

const cryptoPriceModel = mongoose.Schema({
  name: { type: String, reuquired: false },
  value: { type: mongoose.Decimal128, default: "0.00", required: true },
  createdAt: { type: Date, default: Date.now, required: false },
  updatedAt: { type: Date, default: Date.now, required: false },
});

const cryptoPrice = mongoose.model("cryptoPrice", cryptoPriceModel);
module.exports = cryptoPrice;
