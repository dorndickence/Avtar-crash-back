const user = require("../model/user");
const game = require("../game/gameFunction");
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
};
