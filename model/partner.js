const { mongoose } = require("mongoose");

const partnerModel = mongoose.Schema({
  username: { type: String, required: true },
  howFindUs: { type: String, required: true },
  contact: { type: String, required: true },
  contactMethod: { type: String, required: true },
  trafficSource: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  balance: {}, // balance objects
  createdAt: { type: Date, default: Date.now, required: false },
});

const partner = mongoose.model("partner", partnerModel);
module.exports = partner;
