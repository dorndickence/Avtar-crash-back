const { mongoose } = require("mongoose");

const userModel = mongoose.Schema({
  privateUsername: { type: String, required: true },
  publicUsername: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  balance: {}, // balance objects
  createdAt: { type: Date, default: Date.now, required: false },
});

const user = mongoose.model("user", userModel);
module.exports = user;
