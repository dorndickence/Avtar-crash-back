const user = require("../model/user");
const game = require("../game/gameFunction");
const round = require("../model/round");
const partner = require("../model/partner");
const nodemailer = require("nodemailer");
require("dotenv").config();
module.exports = {
  password: async function (req, res) {
    if (req.body.privateUsername === undefined) {
      res.status(409).send({
        data: {},
        message: "Private Username is required",
        success: false,
      });
      return;
    }
    const privateUsername = req.body.privateUsername;
    const getUser = await user.find({ privateUsername: privateUsername });

    if (getUser.length !== 1 && getUser.length !== 0) {
      res.status(409).send({
        message: `Multi user conflicts`,
        success: false,
        data: {},
      });
      return;
    }
    if (getUser.length === 0) {
      res.status(401).send({
        message: `User not found`,
        success: false,
        data: {},
      });
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: process.env.MAIL_SECURE,
      auth: {
        // TODO: replace `user` and `pass` values from <https://forwardemail.net>
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const pass = await game.decrypt(getUser[0].password);
    const password = pass.replace(getUser[0].privateUsername, "");

    // verify connection configuration
    transporter.verify(async function (error, success) {
      if (error) {
        res.status(503).send({
          data: {},
          message: "Email server not available",
          success: true,
        });
      } else {
        const info = await transporter.sendMail({
          from: '"Support" <support@cryptocrash.win>', // sender address
          to: getUser[0].email, // list of receivers
          subject: "Your account password on cryptocrash.win", // Subject line
          html: `<!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Password</title>
          </head>
          <body>
            <table cellpadding="0" cellspacing="0" width="100%" bgcolor="#f0f0f0">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td align="center" style="padding: 40px 0;">
                        <h1 style="color: #333333;">Your Password</h1>
                        <p style="color: #666666;">Your password for accessing our service is:</p>
                        <p style="color: #007bff; font-weight: bold;">${password}</p>
                        <p style="color: #666666;">We recommend keeping your password secure and not sharing it with anyone.</p>
                        <p style="color: #666666;">If you have any questions or concerns, please contact us.</p>
                        <p style="color: #666666;">Thanks,<br>CryptoCrash.com</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
          
          `, // html body
        });

        res.status(200).send({
          data: {},
          message: "Your password has been sent to your email",
          success: true,
        });
      }
    });
  },
  balance: async function (req, res) {
    try {
      if (req.body.token === undefined) {
        res.status(409).send({
          data: {},
          message: "Token is required",
          success: false,
        });
        return;
      }
      const token = req.body.token;
      const getUser = await user.find({ password: token });

      if (getUser.length !== 1 && getUser.length !== 0) {
        res.status(409).send({
          message: `Multi user conflicts`,
          success: false,
          data: {},
        });
        return;
      }
      if (getUser.length === 0) {
        res.status(401).send({
          message: `Please login to withdraw`,
          success: false,
          data: {},
        });
        return;
      }

      const balance = getUser[0].balance;

      res
        .status(200)
        .send({ data: balance, message: "success", success: true });
    } catch (error) {
      console.log(error);
    }
  },
  register: async function (req, res) {
    try {
      const userEmail = req.body.email.toLowerCase();
      const promo = req.body.promo;
      let partnerId = null;
      const userPublicUsername = req.body.publicUsername;
      const userPrivateUsername = req.body.privateUsername.toLowerCase();
      const userPassword = req.body.password;
      const userEncryptedHashPassword = await game.encrypt(
        userPrivateUsername + userPassword
      );

      findUserEmail = await user.findOne({ email: userEmail });
      findUserPrivateUsername = await user.findOne({
        privateUsername: userPrivateUsername,
      });
      if (findUserEmail) {
        res.status(409).send({
          data: {},
          message: "Email already exist. please try another email",
          success: false,
        });
        return;
      }

      if (findUserPrivateUsername) {
        res.status(409).send({
          data: {},
          message:
            "Private username already exist. please try another private username",
          success: false,
        });
        return;
      }

      if (promo.code && promo.type === "promo") {
        const getPartner = await partner.find({ username: promo.code });
        partnerId = getPartner[0]._id;
      }

      if (promo.code && promo.type === "partnerId") {
        partnerId = promo.code;
      }

      const userObject = {
        privateUsername: userPrivateUsername,
        email: userEmail,
        publicUsername: userPublicUsername,
        password: userEncryptedHashPassword,
        partnerId: partnerId,
      };

      const register = await user.create(userObject);
      res.status(200).send({ data: {}, message: "success", success: true });
    } catch (error) {
      res.status(422).send({
        message: "Validation error. All fields required",
        success: false,
        data: error.errors,
      });
    }
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
      const userPrivateUsername = req.body.privateUsername.toLowerCase();

      const userPassword = req.body.password;

      findUser = await user.find({ privateUsername: userPrivateUsername });
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

      //   if (findUserEmail) {
      //     res.status(409).send({
      //       data: {},
      //       message: "Email already exist. please try another email",
      //       success: false,
      //     });
      //     return;
      //   }
    } catch (error) {
      //   console.log(error);
      res.status(422).send({
        message: "Internal server error",
        success: false,
        data: error.errors,
      });
    }
  },
  bet: async function (req, res) {
    try {
      if (req.body.token === undefined) {
        res.status(400).send({
          message: "Login to your account",
          success: false,
          data: {},
        });
        return;
      }

      if (req.body.amount === undefined) {
        res.status(409).send({
          message: "Amount is required",
          success: false,
          data: {},
        });
        return;
      }
      if (req.body.currency === undefined) {
        res.status(409).send({
          message: "Currency is required",
          success: false,
          data: {},
        });
        return;
      }

      if (
        req.body.socketuserId === undefined ||
        game.getWebSocketByUserId(parseInt(req.body.socketuserId)) === null
      ) {
        console.log(game.clients.keys());
        res.status(409).send({
          message: "Connection lost",
          success: false,
          data: {},
        });
        return;
      }

      const token = req.body.token;
      const currency = req.body.currency;

      const socketuserId = parseInt(req.body.socketuserId);
      const amount = parseInt(req.body.amount);
      const getUser = await user.find({ password: token });
      const partnerId = getUser[0].partnerId;
      const getRound = await round.find({
        $and: [
          { hash: game.thisRound.hash },
          { privateUsername: getUser[0].privateUsername },
        ],
      });

      if (getRound.length > 0) {
        res.status(200).send({
          message: `Bet in progress`,
          success: false,
          data: {},
        });
        return;
      }

      if (getUser.length !== 1 && getUser.length !== 0) {
        res.status(409).send({
          message: `Multi user conflicts`,
          success: false,
          data: {},
        });
        return;
      }
      if (getUser.length === 0) {
        res.status(401).send({
          message: `Please login to play`,
          success: false,
          data: {},
        });
        return;
      }
      if (getUser[0].balance[currency] === undefined) {
        res.status(409).send({
          message: "Currency is invalid",
          success: false,
          data: {},
        });
        return;
      }
      if (!game.betTime) {
        res.status(409).send({
          message: `Time Finsihed. Place bet on next round`,
          success: false,
          data: {},
        });
        return;
      }
      if (getUser[0].balance < amount) {
        res.status(409).send({
          message: `Insufficient balance`,
          success: false,
          data: {},
        });
        return;
      }

      await user.findByIdAndUpdate(getUser[0]._id, {
        $inc: {
          [`balance.${currency}`]: -amount,
        },
      });

      if (partnerId !== undefined && partnerId !== null) {
        const partnerCommisssion = parseFloat(
          (amount / 100) * process.env.PARTNER_PERCENT
        );
        await partner.findByIdAndUpdate(partnerId, {
          $inc: {
            [`balance.${currency}`]: partnerCommisssion,
          },
        });
      }

      const betData = {
        hash: game.thisRound.hash,
        amount: amount,
        publicUsername: getUser[0].publicUsername,
        privateUsername: getUser[0].privateUsername,
        win: 0,
        odds: 0,
      };
      const createdRound = await round.create(betData);

      let timeout = 0;
      timeout = game.timer * 600;
      timeout = 6600 - timeout;

      const sendData = {
        token: token,
        timeout: timeout,
      };

      const sendDataGlobal = {
        amount: amount,
        publicUsername: getUser[0].publicUsername,
        win: 0,
        odds: 0,
        _id: createdRound._id,
      };

      game.broadcast(
        { type: "notifyBetPlaced", betData: sendData },
        game.getWebSocketByUserId(socketuserId)
      );

      game.broadcast({ type: "betData", betData: sendDataGlobal });

      res.status(200).send({
        data: {},
        message: "Bet accepted",
        success: true,
      });
    } catch (error) {
      res.status(422).send({
        message: "Internal server error",
        success: false,
        data: error.errors,
      });
    }
  },
  cashout: async function (req, res) {
    try {
      if (req.body.token === undefined) {
        res.status(400).send({
          message: "Token is required",
          success: false,
          data: {},
        });
        return;
      }

      if (
        req.body.socketuserId === undefined ||
        game.getWebSocketByUserId(parseInt(req.body.socketuserId)) === null
      ) {
        res.status(409).send({
          message: "Connection lost",
          success: false,
          data: {},
        });
        return;
      }

      if (req.body.currency === undefined) {
        res.status(409).send({
          message: "Currency is required",
          success: false,
          data: {},
        });
        return;
      }

      const token = req.body.token;
      const currency = req.body.currency;
      const getUser = await user.find({ password: token });
      const socketuserId = parseInt(req.body.socketuserId);
      const partnerId = getUser[0].partnerId;
      const getRound = await round.find({
        $and: [
          { hash: game.thisRound.hash },
          { privateUsername: getUser[0].privateUsername },
        ],
      });

      if (getUser.length !== 1 && getUser.length !== 0) {
        res.status(409).send({
          message: `Multi user conflicts`,
          success: false,
          data: {},
        });
        return;
      }
      if (getUser.length === 0) {
        res.status(401).send({
          message: `Please login to play`,
          success: false,
          data: {},
        });
        return;
      }

      if (getUser[0].balance[currency] === undefined) {
        res.status(409).send({
          message: "Currency is invalid",
          success: false,
          data: {},
        });
        return;
      }

      if (game.thisRound.crashed) {
        res.status(409).send({
          message: `Better luck next time`,
          success: false,
          data: {},
        });
        return;
      }

      if (getRound.length < 1 || parseFloat(getRound[0].win) > 0) {
        res.status(409).send({
          message: `Round finished`,
          success: false,
          data: {},
        });
        return;
      }
      // const betData = {
      //   amount: amount,
      //   username: getUser[0].publicUsername,
      //   win: 0,
      //   odds: 0,
      // };
      // game.betData.includes();

      // game.broadcast({ type: "betData", betData: betData });
      cashoutOdds = game.crashNumber;
      winAmount = (cashoutOdds * getRound[0].amount).toFixed(2);
      await user.findByIdAndUpdate(getUser[0]._id, {
        $inc: {
          [`balance.${currency}`]: parseFloat(winAmount),
        },
      });
      await round.updateOne(
        {
          $and: [
            { hash: game.thisRound.hash },
            { privateUsername: getUser[0].privateUsername },
          ],
        },
        { $set: { odds: cashoutOdds, win: winAmount } }
      );

      if (partnerId !== undefined && partnerId !== null) {
        const partnerCommisssion = parseFloat(
          (winAmount / 100) * process.env.PARTNER_PERCENT
        );
        await partner.findByIdAndUpdate(partnerId, {
          $inc: {
            [`balance.${currency}`]: -partnerCommisssion,
          },
        });
      }

      game.broadcast(
        {
          type: "notifyBetWon",
          token: token,
        },
        game.getWebSocketByUserId(socketuserId)
      );

      game.broadcast({
        type: "winData",
        _id: getRound[0]._id,
        amount: winAmount,
        odds: cashoutOdds,
      });

      res.status(200).send({
        data: getRound,
        message: `Cashed out ${winAmount}`,
        amount: winAmount,
        success: true,
      });
    } catch (error) {
      console.log(error);
      res.status(422).send({
        message: "Internal server error",
        success: false,
        data: error.errors,
      });
    }
  },
};
