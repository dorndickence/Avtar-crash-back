const user = require("../model/user");
const partnerWithdraw = require("../model/partnerWithdraw");
const round = require("../model/round");
const partner = require("../model/partner");
const game = require("../game/gameFunction");
const axios = require("axios");
const cryptoPrice = require("../model/cryptoPrice");
const decimal = require("decimal.js");
require("dotenv").config();
module.exports = {
  password: async function (req, res) {
    if (req.body.privateUsername === undefined) {
      res.status(409).send({
        data: {},
        message: "Username is required",
        success: false,
      });
      return;
    }
    const privateUsername = req.body.privateUsername;
    const getUser = await partner.find({ username: privateUsername });

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
    const password = pass.replace(getUser[0].username, "");

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
  withdraw: async function (req, res) {
    if (req.body.token === undefined) {
      res.status(400).send({
        message: "Token is required",
        success: false,
        data: {},
      });
      return;
    }
    if (req.body.amount === undefined) {
      res.status(400).send({
        message: "amount is required",
        success: false,
        data: {},
      });
      return;
    }

    if (req.body.coin === undefined) {
      res.status(400).send({
        message: "Currency is required",
        success: false,
        data: {},
      });
      return;
    }

    if (req.body.account === undefined) {
      res.status(400).send({
        message: "Payout account is required",
        success: false,
        data: {},
      });
      return;
    }

    const token = req.body.token;
    const coin = req.body.coin;
    const amount = parseFloat(req.body.amount);
    const account = req.body.account;
    const getUser = await partner.find({ password: token });

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

    const balance = getUser[0].balance[coin];

    if (balance === undefined) {
      res.status(409).send({
        message: `You have no money`,
        success: false,
        data: {},
      });
      return;
    }
    if (balance < amount) {
      res.status(409).send({
        message: `You do not have enough funds in your desired wallet.`,
        success: false,
        data: {},
      });
      return;
    }

    if (isNaN(amount)) {
      res.status(409).send({
        message: `Type Number.`,
        success: false,
        data: {},
      });
      return;
    }

    const balanceAll = getUser[0].balance;
    let totalUsd = 0;
    await Promise.all(
      Object.entries(balanceAll).map(async ([currency, amount]) => {
        const OneCoinToUsdPriceObject = await cryptoPrice.find({
          name: currency,
        });
        const OneCoinToUsdPrice = parseFloat(OneCoinToUsdPriceObject[0].value);
        const usdAmount = amount * OneCoinToUsdPrice;

        totalUsd += usdAmount;
      })
    );
    const amountInUSdObject = await cryptoPrice.find({
      name: coin,
    });
    const amountInUSd = parseFloat(amountInUSdObject[0].value) * amount;
    if (totalUsd < amountInUSd) {
      res.status(409).send({
        message: `You can withdraw maximum ${
          totalUsd / parseFloat(amountInUSdObject[0].value)
        } ${coin.toUpperCase()}`,
        success: false,
        data: {},
      });
      return;
    }

    // check for previous withdraw request

    const getUserWithdraw = await partnerWithdraw.find({
      $and: [{ partnerId: getUser[0]._id }, { status: "In Progress" }],
    });

    if (getUserWithdraw.length > 0) {
      res.status(409).send({
        message: `You already have withdraw in progress.`,
        success: false,
        data: {},
      });
      return;
    }

    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `https://api.nowpayments.io/v1/payout-withdrawal/min-amount/${coin}`,
      headers: {
        "x-api-key": "SX7W75F-J76MBF5-PDY3E6P-NRWCNKJ",
      },
    };

    axios(config)
      .then(async (response) => {
        if (response.data.result > amount) {
          res.status(409).send({
            message: `Minimum amount ${response.data.result}.`,
            success: false,
            data: {},
          });
          return;
        }
        // await partner.findByIdAndUpdate(getUser[0]._id, {
        //   $inc: {
        //     [`balance.${coin}`]: -amount,
        //   },
        // });
        await partnerWithdraw.create({
          status: "In Progress",
          partnerId: getUser[0]._id,
          payoutCurrency: coin,
          amount: amount,
          account: account,
        });

        res.status(200).send({
          data: {},
          message: `Withdraw request accepted`,
          success: true,
        });
      })
      .catch((error) => {
        console.log(error);
        res.status(404).send({
          data: {},
          message: `Try again later`,
          success: false,
        });
      });
  },
  convertToUSD: async function (currency, amount) {
    const oneCryptoToUSD = await cryptoPrice.find({ name: currency });
    return parseFloat(amount) * parseFloat(oneCryptoToUSD[0].value);
  },
  players: async function (req, res) {
    try {
      const getPartner = await this.authPartner(req, res);

      const historyAll = await user.find({ partnerId: getPartner._id });

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

      const allPlayers = await user
        .find({ partnerId: getPartner._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPageData);

      const playerObject = await Promise.all(
        allPlayers.map(async (player) => {
          const getAllGames = await round.find({
            privateUsername: player.privateUsername,
          });
          const totalBet = getAllGames.reduce(
            async (acumulator, singleGame) =>
              acumulator +
              (await this.convertToUSD(singleGame.currency, singleGame.amount)),
            0
          );
          const totalWin = getAllGames.reduce(
            async (acumulator, singleGame) =>
              acumulator +
              (await this.convertToUSD(singleGame.currency, singleGame.win)),
            0
          );

          const pnl = totalWin - totalBet;

          let commission = (pnl / 100) * process.env.PARTNER_PERCENT;
          commission *= -1;

          return {
            name: player.publicUsername,
            pnl: pnl,
            commission: commission,
            date: player.createdAt,
          };
        })
      );

      res.status(200).send({
        message: "Players History",
        data: playerObject,
        totalPages: totalArray,
      });
    } catch (error) {
      if (typeof error !== "string") {
        res.status(503).send({
          data: {},
          message: "server error",
          success: false,
        });
      } else {
        res.status(409).send({
          data: {},
          message: error,
          success: false,
        });
      }
    }
  },
  authPartner: function (req, res) {
    return new Promise(async (resolve, reject) => {
      if (req.body.token === undefined) {
        reject("Token is required");
      }

      const token = req.body.token;
      const getUser = await partner.find({ password: token });

      if (getUser.length !== 1 && getUser.length !== 0) {
        reject("Multi user conflicts");
      }
      if (getUser.length === 0) {
        reject("Login to access");
      }

      resolve(getUser[0]);
    });
  },
  withdrawHistory: async function (req, res) {
    try {
      const getUser = await this.authPartner(req, res);

      const historyAll = await partnerWithdraw.find({ partnerId: getUser._id });

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
        .find({ partnerId: getUser._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPageData);

      res.status(200).send({
        message: "Partner Withdraw History",
        success: false,
        data: history,
        totalPages: totalArray,
      });
    } catch (error) {
      if (typeof error !== "string") {
        res.status(503).send({
          data: {},
          message: "server error",
          success: false,
        });
      } else {
        res.status(409).send({
          data: {},
          message: error,
          success: false,
        });
      }
    }
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
      const getUser = await partner.find({ password: token });

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
      const getPartneredUser = await user.find({ partnerId: getUser[0]._id });
      const balance = getUser[0].balance || [];
      let totalUsd = 0;

      await Promise.all(
        Object.entries(balance).map(async ([currency, amount]) => {
          const OneCoinToUsdPriceObject = await cryptoPrice.find({
            name: currency,
          });
          const OneCoinToUsdPrice = parseFloat(
            OneCoinToUsdPriceObject[0].value
          );
          const usdAmount = parseFloat(amount) * OneCoinToUsdPrice;

          totalUsd += usdAmount;

          //here goes available seprate postive and negative currency
        })
      );

      const totalWithdrawn = await partnerWithdraw.find({
        partnerId: getUser[0]._id,
        status: "finished",
      });

      const total = totalWithdrawn.reduce((acc, si) => acc + si.amount, 0);

      res.status(200).send({
        data: balance,
        totalUsd: totalUsd,
        partners: getPartneredUser.length,
        withdrawn: total,
        partnerId: getUser[0]._id,
        promo: getUser[0].username,
        message: "success",
        success: true,
      });
    } catch (error) {
      console.log(error);
    }
  },
  register: async function (req, res) {
    try {
      const userEmail = req.body.email.toLowerCase();
      const username = req.body.username;
      const contact = req.body.contact;
      const contactMethod = req.body.contactMethod;
      const howFindUs = req.body.howFindUs;
      const trafficSource = req.body.trafficSource;
      const userPassword = req.body.password;
      const userEncryptedHashPassword = await game.encrypt(
        username + userPassword
      );

      findUserEmail = await partner.findOne({ email: userEmail });
      findUserPrivateUsername = await partner.findOne({
        username: username,
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

      const userObject = {
        username: username,
        email: userEmail,
        contact: contact,
        contactMethod: contactMethod,
        trafficSource: trafficSource,
        howFindUs: howFindUs,
        password: userEncryptedHashPassword,
      };

      const register = await partner.create(userObject);
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

      findUser = await partner.find({ username: userPrivateUsername });
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
};
