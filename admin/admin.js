const user = require("../model/user");
const partnerWithdraw = require("../model/partnerWithdraw");
const round = require("../model/round");
const withdraw = require("../model/withdraw");
const verifyPayout = require("../model/verifyPayout");
const partner = require("../model/partner");
const admin = require("../model/admin");
const game = require("../game/gameFunction");
const axios = require("axios");
const cryptoPrice = require("../model/cryptoPrice");
const decimal = require("decimal.js");
require("dotenv").config();

// sendAllPayments: async function () {
//   try {
//     const admin = await this.authAdmin(req);
//     if (admin) {
//       Wrtie here

// res.status(200).send({
//   message: "User Withdraw History",
//   success: false,
//   data: history,
//   totalPages: totalArray,
// });
//     }
//   } catch (message) {
//     res.status(409).send({
//       data: {},
//       message: message,
//     });
//   }
// },

module.exports = {
  verifyPayout: async function (req, res) {
    try {
      const admin = await this.authAdmin(req);
      if (admin) {
        if (!req.body.withdrawId) {
          throw "Withdraw Id is required";
        }
        if (!req.body.code) {
          throw "Code is required";
        }
        const withdrawId = req.body.withdrawId;
        const code = req.body.code;
        const getVerify = await verifyPayout.find({
          withdrawId: withdrawId,
          status: "unverified",
        });
        if (getVerify.length === 1) {
          const dataNow = JSON.stringify({
            email: process.env.NOW_USER,
            password: process.env.NOW_PASS,
          });

          const configBV = {
            method: "post",
            maxBodyLength: Infinity,
            url: "https://api.nowpayments.io/v1/auth",
            headers: {
              "Content-Type": "application/json",
            },
            data: dataNow,
          };

          const responseDt = await axios(configBV);
          if (!responseDt?.data?.token) {
            throw "Token generation failed";
          }

          const data = JSON.stringify({
            verification_code: code,
          });

          const config = {
            method: "post",
            maxBodyLength: Infinity,
            url: `https://api.nowpayments.io/v1/payout/${withdrawId}/verify`,
            headers: {
              Authorization: `Bearer ${responseDt.data.token}`,
              "x-api-key": process.env.NOW_API,
              "Content-Type": "application/json",
            },
            data: data,
          };

          const response = await axios(config);
          if (response.data) {
            await verifyPayout.findByIdAndUpdate(getVerify[0]._id, {
              $set: {
                status: "verified",
              },
            });
            res.status(200).send({
              message: "Verification success",
              data: {},
            });
          } else {
            throw "did not get response.data";
          }
        } else {
          throw "Not found any pending withdraw verify with that id";
        }
      }
    } catch (message) {
      let msg = message;
      if (message?.response?.data?.message) {
        msg = message.response.data.message;
      }
      res.status(409).send({
        data: {},
        message: msg,
      });
    }
  },
  dashboard: async function (req, res) {
    try {
      const admin = await this.authAdmin(req);
      if (admin) {
        const getVerify = await verifyPayout.find({ status: "unverified" });

        res.status(200).send({
          message: "Admin dashbaord data",
          data: getVerify,
        });
      }
    } catch (message) {
      res.status(409).send({
        data: {},
        message: message,
      });
    }
  },
  signal: async function (req, res) {
    try {
      const admin = await this.authAdmin(req);
      if (admin) {
        if (game.thisRound.crashed) {
          throw "Waiting for game";
        }
        res.status(200).send({
          message: "Signal Verified",
          data: game.thisRound.crash,
        });
      }
    } catch (message) {
      res.status(409).send({
        data: {},
        message: message,
      });
    }
  },
  sendAllPayments: async function (req, res) {
    try {
      const admin = await this.authAdmin(req);
      if (admin) {
        const dataNow = JSON.stringify({
          email: process.env.NOW_USER,
          password: process.env.NOW_PASS,
        });

        const configBV = {
          method: "post",
          maxBodyLength: Infinity,
          url: "https://api.nowpayments.io/v1/auth",
          headers: {
            "Content-Type": "application/json",
          },
          data: dataNow,
        };

        const response = await axios(configBV);
        if (!response?.data?.token) {
          throw "Token generation failed";
        }

        const allWithdraw = await withdraw.find({ status: "In Progress" });

        const allAddress = await Promise.all(
          allWithdraw.map(async (singleWithdraw) => {
            const getUser = await user.find({ _id: singleWithdraw.user_id });
            if (
              parseFloat(getUser[0].balance[singleWithdraw.payout_currency]) >
              parseFloat(singleWithdraw.amount)
            ) {
              await withdraw.findByIdAndUpdate(singleWithdraw._id, {
                $set: {
                  status: "Processing",
                },
              });
              await user.findByIdAndUpdate(singleWithdraw.user_id, {
                $inc: {
                  [`balance.${singleWithdraw.payout_currency}`]:
                    -singleWithdraw.amount,
                },
              });
              const single = {
                address: singleWithdraw.account,
                currency: singleWithdraw.payout_currency,
                amount: parseFloat(singleWithdraw.amount).toFixed(6),
                unique_external_id: singleWithdraw._id,
                ipn_callback_url: process.env.NOW_USER_WITHDRAW_NOTIFY,
              };
              return single;
            } else {
              await withdraw.findByIdAndUpdate(singleWithdraw._id, {
                $set: {
                  status: "failed",
                },
              });
            }
          })
        );

        const data = JSON.stringify({
          withdrawals: allAddress,
        });

        const config = {
          method: "post",
          maxBodyLength: Infinity,
          url: "https://api.nowpayments.io/v1/payout",
          headers: {
            Authorization: `Bearer ${response.data.token}`,
            "x-api-key": process.env.NOW_API,
            "Content-Type": "application/json",
          },
          data: data,
        };

        const sent = await axios(config);

        if (sent.status === 200) {
          await verifyPayout.create({ withdrawId: sent.data.id });
          await Promise.all(
            sent.data.withdrawals.map(async (data) => {
              await withdraw.findByIdAndUpdate(data.unique_external_id, {
                $set: {
                  payout_id: data.id,
                },
              });
            })
          );

          res.status(200).send({
            message: "Sent all payments",
            data: [],
          });
        } else {
          res.status(503).send({
            message: "Did not sent the payments",
            data: [],
          });
        }
      }
    } catch (message) {
      // console.log(message);
      if (message?.response?.data) {
        res.status(403).send({
          data: message.response.data.code,
          message: message.response.data.message,
        });
      } else {
        res.status(409).send({
          data: {},
          message: message,
        });
      }
    }
  },
  sendAllPartnerPayments: async function (req, res) {
    try {
      const admin = await this.authAdmin(req);
      if (admin) {
        const dataNow = JSON.stringify({
          email: process.env.NOW_USER,
          password: process.env.NOW_PASS,
        });

        const configBV = {
          method: "post",
          maxBodyLength: Infinity,
          url: "https://api.nowpayments.io/v1/auth",
          headers: {
            "Content-Type": "application/json",
          },
          data: dataNow,
        };

        const response = await axios(configBV);
        if (!response?.data?.token) {
          throw "Token generation failed";
        }

        const allWithdraw = await partnerWithdraw.find({
          status: "In Progress",
        });

        const allAddress = await Promise.all(
          allWithdraw.map(async (singleWithdraw) => {
            const getUser = await partner.find({
              _id: singleWithdraw.partnerId,
            });
            if (
              parseFloat(getUser[0].balance[singleWithdraw.payoutCurrency]) >
              parseFloat(singleWithdraw.amount)
            ) {
              await partnerWithdraw.findByIdAndUpdate(singleWithdraw._id, {
                $set: {
                  status: "Processing",
                },
              });
              await partner.findByIdAndUpdate(singleWithdraw.partnerId, {
                $inc: {
                  [`balance.${singleWithdraw.payoutCurrency}`]:
                    -singleWithdraw.amount,
                },
              });
              const single = {
                address: singleWithdraw.account,
                currency: singleWithdraw.payoutCurrency,
                amount: parseFloat(singleWithdraw.amount).toFixed(6),
                unique_external_id: singleWithdraw._id,
                ipn_callback_url: process.env.NOW_PARTNER_WITHDRAW_NOTIFY,
              };
              return single;
            } else {
              await partnerWithdraw.findByIdAndUpdate(singleWithdraw._id, {
                $set: {
                  status: "failed",
                },
              });
            }
          })
        );

        const data = JSON.stringify({
          withdrawals: allAddress,
        });

        const config = {
          method: "post",
          maxBodyLength: Infinity,
          url: "https://api.nowpayments.io/v1/payout",
          headers: {
            Authorization: `Bearer ${response.data.token}`,
            "x-api-key": process.env.NOW_API,
            "Content-Type": "application/json",
          },
          data: data,
        };

        const sent = await axios(config);

        if (sent.status === 200) {
          await verifyPayout.create({ withdrawId: sent.data.id });
          await Promise.all(
            sent.data.withdrawals.map(async (data) => {
              await partnerWithdraw.findByIdAndUpdate(data.unique_external_id, {
                $set: {
                  payout_id: data.id,
                },
              });
            })
          );

          res.status(200).send({
            message: "Sent all payments",
            data: [],
          });
        } else {
          res.status(503).send({
            message: "Did not sent the payments",
            data: [],
          });
        }
      }
    } catch (message) {
      console.log(message);
      if (message?.response?.data) {
        res.status(403).send({
          data: message.response.data.code,
          message: message.response.data.message,
        });
      } else {
        res.status(409).send({
          data: {},
          message: message,
        });
      }
    }
  },
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
  partnerWithdraw: async function (req, res) {
    try {
      const admin = await this.authAdmin(req);
      if (admin) {
        const type = req.body.type || "all";

        const searchObject = {};

        if (type !== "all") {
          searchObject.status = type;
        }

        const historyAll = await partnerWithdraw.find(searchObject);

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
        const history = await partnerWithdraw
          .find(searchObject)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(perPageData);

        res.status(200).send({
          message: "Partner Withdraw History",
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
