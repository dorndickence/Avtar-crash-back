const game = require("../game/gameFunction");
const round = require("../model/round");
const user = require("../model/user");
module.exports = {
  getlivebet: async function (req, res) {
    try {
      // hash: game.thisRound.hash
      let userBetActve = false;
      if (req.body.token) {
        userData = await user.find({ password: req.body.token });
        userBet = await round.find({
          $and: [
            { hash: game.thisRound.hash },
            { privateUsername: userData[0].privateUsername },
          ],
        });

        if (userBet.length >= 1 && parseFloat(userBet[0].win) === 0) {
          userBetActve = true;
        }
      }

      Allgames = await round.find({ hash: game.thisRound.hash });

      let winnings = 0,
        bets = 0;
      const players = Allgames.length;

      Allgames.forEach((roundObject) => {
        winnings += parseFloat(roundObject.win);
        bets += parseFloat(roundObject.amount);
      });

      res.status(200).send({
        data: {
          livebets: Allgames,
          winnings: winnings,
          bets: bets,
          players: players,
          userBetActve: userBetActve,
        },
        message: "success",
        success: true,
      });
    } catch (error) {
      res.status(422).send({
        message: "Unknown error",
        success: false,
        data: error.errors,
      });
    }
  },
};
