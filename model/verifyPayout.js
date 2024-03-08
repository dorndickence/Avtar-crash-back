const { mongoose } = require("mongoose");

const verifyPayoutModel = mongoose.Schema({
  withdrawId: { type: String, required: true },
  status: { type: String, required: false, default: "unverified" },
  createdAt: { type: Date, default: Date.now, required: false },
});

const verifyPayout = mongoose.model("verifyPayout", verifyPayoutModel);
module.exports = verifyPayout;
