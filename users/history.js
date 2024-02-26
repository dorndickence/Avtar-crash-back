const user = require("../model/user");
const deposit = require("../model/deposit");
const withdraw = require("../model/withdraw");
module.exports = {
  deposit: async function (req, res) {
    try {
      const userid = await this.authUser(req, res);
      if (userid) {
        const history = await deposit.find({ user_id: userid });

        res.status(200).send({
          message: "User Deposit History",
          success: false,
          data: history,
        });
      }
    } catch (error) {
      console.log(error);
    }
  },
  withdraw: async function (req, res) {
    try {
      const userid = await this.authUser(req, res);
      if (userid) {
        const history = await withdraw.find({ user_id: userid });

        res.status(200).send({
          message: "User Withdraw History",
          success: false,
          data: history,
        });
      }
    } catch (error) {
      console.log(error);
    }
  },
  authUser: async function (req, res) {
    if (req.body.token === undefined) {
      res.status(400).send({
        message: "Token is required",
        success: false,
        data: {},
      });
      return false;
    }
    const token = req.body.token;
    const getUser = await user.find({ password: token });

    if (getUser.length !== 1 && getUser.length !== 0) {
      res.status(409).send({
        message: `Multi user conflicts`,
        success: false,
        data: {},
      });
      return false;
    }
    if (getUser.length === 0) {
      res.status(401).send({
        message: `Please login to withdraw`,
        success: false,
        data: {},
      });
      return false;
    }
    return getUser[0]._id;
  },
};
