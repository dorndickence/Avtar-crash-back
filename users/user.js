const user = require("../model/user");
const game = require("../game/gameFunction");
const round = require("../model/round");
module.exports = {
  register: async function (req, res) {
    try {
      const userEmail = req.body.email.toLowerCase();
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

      const userObject = {
        privateUsername: userPrivateUsername,
        email: userEmail,
        publicUsername: userPublicUsername,
        password: userEncryptedHashPassword,
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

      const token = req.body.token;
      const amount = parseInt(req.body.amount);
      const getUser = await user.find({ password: token });
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

      await user.updateOne({ password: token }, { $inc: { balance: -amount } });

      const betData = {
        hash: game.thisRound.hash,
        amount: amount,
        publicUsername: getUser[0].publicUsername,
        privateUsername: getUser[0].privateUsername,
        win: 0,
        odds: 0,
      };
      const createdRound = await round.create(betData);

      const sendData = {
        amount: amount,
        publicUsername: getUser[0].publicUsername,
        win: 0,
        odds: 0,
        _id: createdRound._id,
      };

      game.broadcast({ type: "betData", betData: sendData });
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

      const token = req.body.token;
      const getUser = await user.find({ password: token });

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

      if (game.thisRound.crashed) {
        res.status(409).send({
          message: `Better luck next time`,
          success: false,
          data: {},
        });
        return;
      }

      if (getRound.length < 1) {
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
      await user.updateOne(
        { password: token },
        { $inc: { balance: winAmount } }
      );
      await round.updateOne(
        { hash: game.thisRound.hash },
        { $set: { odds: cashoutOdds, win: winAmount } }
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
};
