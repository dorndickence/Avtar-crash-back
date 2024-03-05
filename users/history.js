const user = require("../model/user");
const deposit = require("../model/deposit");
const withdraw = require("../model/withdraw");
const round = require("../model/round");

module.exports = {
  deposit: async function (req, res) {
    try {
      const userid = await this.authUser(req, res);
      if (userid) {
        const historyAll = await deposit.find({ user_id: userid });

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

        const history = await deposit
          .find({ user_id: userid })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(perPageData);

        res.status(200).send({
          message: "User Deposit History",
          success: false,
          totalPages: totalArray,
          data: history,
        });
      }
    } catch (error) {
      console.log(error);
    }
  },
  game: async function (req, res) {
    try {
      const privateUsername = await this.authUser(req, res, "privateUsername");
      if (privateUsername) {
        const historyAll = await round.find({
          privateUsername: privateUsername,
        });

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

        const history = await round
          .find({ privateUsername: privateUsername })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(perPageData);

        res.status(200).send({
          message: "User Game History",
          success: false,
          data: history,
          totalPages: totalArray,
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
        const historyAll = await withdraw.find({ user_id: userid });

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
          .find({ user_id: userid })
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
    } catch (error) {
      console.log(error);
    }
  },
  authUser: async function (req, res, type) {
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
    if (type === "privateUsername") {
      return getUser[0].privateUsername;
    } else {
      return getUser[0]._id;
    }
  },
};
