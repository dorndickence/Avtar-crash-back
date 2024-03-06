const user = require("../model/user");
const partnerWithdraw = require("../model/partnerWithdraw");
const round = require("../model/round");
const withdraw = require("../model/withdraw");
const partner = require("../model/partner");
const admin = require("../model/admin");
const game = require("../game/gameFunction");
const axios = require("axios");
const cryptoPrice = require("../model/cryptoPrice");
const decimal = require("decimal.js");
require("dotenv").config();
module.exports = {
  userWithdraw: async function (req, res) {
    try {
      const admin = await this.authAdmin(req);
      if (admin) {
        const type = req.body.type || "all";

        const searchObject = {};

        if (type !== "all") {
          searchObject.status = type;
        }

        const historyAll = await withdraw.find(searchObject);

        const perPageData = 20;
        const requestedPage = req.body.page || 0;

        let requestedPageNumber = parseInt(requestedPage);
        let skip = perPageData * requestedPageNumber;
        if (requestedPageNumber === 0) {
          skip = 0;
        }

        const total = Math.ceil(historyAll.length / 20);
        const totalArray = [];
        for (i = 1; i <= total; i++) {
          totalArray.push(i);
        }
        const history = await withdraw
          .find(searchObject)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(perPageData);

        res.status(200).send({
          message: "User Withdraw History",
          success: false,
          data: history,
          totalPages: totalArray,
        });
      }
    } catch (message) {
      res.status(409).send({
        data: {},
        message: message,
        success: false,
      });
    }
  },
  authAdmin: function (req) {
    return new Promise(async (resolve, reject) => {
      if (req.body.token === undefined) {
        reject("Token is required");
      }

      const token = req.body.token;
      const getUser = await admin.find({ password: token });

      if (getUser.length !== 1 && getUser.length !== 0) {
        reject("Multi user conflicts");
      }
      if (getUser.length === 0) {
        reject("Login to access");
      }

      resolve(getUser[0]);
    });
  },
  login: async function (req, res) {
    try {
      if (req.body.privateUsername === undefined) {
        res.status(409).send({
          message: "Username is required",
          success: false,
          data: {},
        });
        return;
      }
      if (req.body.password === undefined) {
        res.status(409).send({
          message: "Password is required",
          success: false,
          data: {},
        });
        return;
      }
      adminTotal = await admin.find({});
      if (adminTotal.length === 0) {
        await admin.create({});
      }
      const userPrivateUsername = req.body.privateUsername.toLowerCase();

      const userPassword = req.body.password;

      findUser = await admin.find({ username: userPrivateUsername });
      if (findUser.length === 1) {
        const decryptedHash = game.decrypt(findUser[0].password);
        if (decryptedHash === userPrivateUsername + userPassword) {
          res.status(200).send({
            data: { token: findUser[0].password },
            message: "success",
            success: true,
          });
        } else {
          res.status(409).send({
            data: {},
            message: "Invalid Password. Please try again",
            success: false,
          });
        }
      } else if (findUser.length === 0) {
        res.status(409).send({
          data: {},
          message: "Invalid Username. Please try again",
          success: false,
        });
      } else {
        res.status(409).send({
          data: {},
          message: "Multi user error conflicts. Please contact support",
          success: false,
        });
        return;
      }
    } catch (error) {
      //   console.log(error);
      res.status(422).send({
        message: "Internal server error",
        success: false,
        data: error.errors,
      });
    }
  },
};
