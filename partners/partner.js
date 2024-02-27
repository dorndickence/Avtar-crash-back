const user = require("../model/user");
const partner = require("../model/partner");
const game = require("../game/gameFunction");
module.exports = {
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
