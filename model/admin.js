const game = require("../game/gameFunction");
const { mongoose } = require("mongoose");

const adminModel = mongoose.Schema({
  username: { type: String, required: false, default: "admin" },
  email: { type: String, required: false, default: "admin@admin.com" },
  password: {
    type: String,
    required: false,
    default: game.encrypt("adminpassword"),
  },
  createdAt: { type: Date, default: Date.now, required: false },
});

const admin = mongoose.model("admin", adminModel);
module.exports = admin;
