const { mongoose } = require("mongoose");
const userModel = mongoose.Schema({
  privateUsername: { type: String, reuquired: true },
  publicUsername: { type: String, required: true },
  email: { type: String, reuquired: true },
  password: { type: String, required: true },
  balance: {
    type: mongoose.Types.Decimal128,
    default: "0.00",
    required: false,
  },
  createdAt: { type: Date, default: new Date(), required: false },
});

const user = mongoose.model("user", userModel);
module.exports = user;
