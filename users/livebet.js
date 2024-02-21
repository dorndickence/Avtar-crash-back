const game = require("../game/gameFunction");
const round = require("../model/round");
module.exports = {
  getlivebet: async function (req, res) {
    try {
      // hash: game.thisRound.hash
      Allgames = await round.find({ hash: game.thisRound.hash });

      res
        .status(200)
        .send({ data: Allgames, message: "success", success: true });
    } catch (error) {
      res.status(422).send({
        message: "Unknown error",
        success: false,
        data: error.errors,
      });
    }
  },
};
