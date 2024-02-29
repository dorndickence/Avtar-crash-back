const { Decimal } = require("decimal.js");
const CryptoJS = require("crypto-js");
const WebSocket = require("ws");

const round = require("../model/round");

module.exports = {
  broadcast: function (message, singleSocket = null) {
    message = this.encrypt(message); // Use this.encrypt() to reference the encrypt function
    if (singleSocket === null) {
      this.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    } else {
      if (singleSocket.readyState === WebSocket.OPEN) {
        singleSocket.send(message);
      }
    }
  },
  findMissingNumbers: function (arr) {
    let expectedNumber = 0;
    while (true) {
      if (
        arr[expectedNumber] !== expectedNumber &&
        !arr.includes(expectedNumber)
      ) {
        return expectedNumber;
      }
      expectedNumber++;
    }
  },
  getUserIdByWebSocket: function (webSocket) {
    for (const [userId, ws] of this.clients.entries()) {
      if (ws === webSocket) {
        return userId;
      }
    }
    return null;
  },
  getWebSocketByUserId: function (userId) {
    for (const [clientId, ws] of this.clients.entries()) {
      if (clientId === userId) {
        return ws;
      }
    }
    return null;
  },
  getRandomNumber: function (min, max, decimalPlaces, array) {
    // Generate a random number between min and max (inclusive)
    const xxx = Math.random() * (max - min) + min;
    let randomNumber = Math.round(xxx);
    // console.log(parseInt(xxx.toFixed(0)), randomNumber);

    // Round the number to the specified decimal places
    // if (decimalPlaces !== undefined) {
    //   const factor = Math.pow(10, decimalPlaces);
    //   randomNumber = Math.round(randomNumber * factor) / factor;
    // }

    const newNum = array[randomNumber];
    // Generate a random number between min and max (inclusive)
    let randomNumberx = Math.random() * (newNum.max - newNum.min) + newNum.min;

    // Round the number to the specified decimal places
    if (decimalPlaces !== undefined) {
      const factor = Math.pow(10, decimalPlaces);
      randomNumberx = Math.round(randomNumberx * factor) / factor;
    }
    return randomNumberx;
  },
  encrypt: function (object) {
    // Encryption
    const obj = object;
    const jsonString = JSON.stringify(obj);
    const key = "secret key";
    const encryptedData = CryptoJS.AES.encrypt(jsonString, key).toString();
    return encryptedData;
  },
  decrypt: function (object) {
    const encryptedData = object;
    const key = "secret key";
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
    const decryptedObj = JSON.parse(decryptedString);
    return decryptedObj;
  },
  generateRandomCrash: function () {
    if (this.thisRound.crashed) {
      // Example usage:
      const array = [
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 3.0 },
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 4.0 },
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 5.0 },
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 6.0 },
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 7.0 },
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 10.0 },
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 30.0 },
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 100.0 },
        { min: 1.0, max: 2.0 },
        { min: 1.0, max: 2.0 },
      ];
      const min = 0;
      const max = array.length - 1;

      const decimalPlaces = 2;
      const randomNumber = this.getRandomNumber(min, max, decimalPlaces, array); // Use this.getRandomNumber() to reference the getRandomNumber function

      this.thisRound.crashed = false;
      // broadcast({ type: "crashed", crashed: thisRound.crashed });
      // io.emit("crashed", encrypt({ crashed: thisRound.crashed }));
      this.thisRound.crash = randomNumber;
    }
  },
  crashStreaming: function () {
    let adding = new Decimal(this.speed.use); // Use this.speed.use to reference the speed.use property
    this.crashNumber = this.crashNumber.plus(adding); // Update this.crashNumber
    this.broadcast({ type: "crash", crash: this.crashNumber }); // Use this.broadcast() to reference the broadcast function
    // console.log(this.crashNumber);
    // io.emit("crash", encrypt({ crash: crashNumber }));
  },
  updateDataRound: async function () {
    const checkRound = await round.find({ hash: this.thisRound.hash });
    if (checkRound.length > 0) {
      await round.updateMany(
        { hash: this.thisRound.hash }, // Filter condition
        { $set: { crash: this.thisRound.crash } } // Update operation
      );
    }
  },
  crashRunner: function () {
    if (this.thisRound.crash <= this.crashNumber) {
      this.thisRound.crashed = true;
      this.speed.use = "0.01";
      this.speed.logic = 1;
      this.updateDataRound();
      this.thisRound.hash = this.encrypt(this.thisRound.crash);
      this.broadcast({
        type: "crashed",
        crashed: this.thisRound.crashed,
        crash: this.thisRound.crash,
      });
      // io.emit("crashed", encrypt({ crashed: thisRound.crashed }));

      clearInterval(this.streamCrash);

      this.streamTimerF();
    } else {
      if (this.crashNumber > 1.1 && this.speed.logic === 1) {
        // this.speed.use = "0.02";
        this.speed.logic = 2;
        clearInterval(this.streamCrash);
        this.streamCrashF(120);
      } else if (this.crashNumber > 1.3 && this.speed.logic === 2) {
        this.speed.use = "0.01";
        this.speed.logic = 3;
        clearInterval(this.streamCrash);
        this.streamCrashF(100);
      } else if (this.crashNumber > 1.6 && this.speed.logic === 3) {
        this.speed.use = "0.01";
        this.speed.logic = 4;
        clearInterval(this.streamCrash);
        this.streamCrashF(80);
      } else if (this.crashNumber > 2.1 && this.speed.logic === 4) {
        this.speed.use = "0.03";
        this.speed.logic = 5;
        clearInterval(this.streamCrash);
        this.streamCrashF(120);
      } else if (this.crashNumber > 3.7 && this.speed.logic === 5) {
        this.speed.use = "0.06";
        this.speed.logic = 6;
        clearInterval(this.streamCrash);
        this.streamCrashF(100);
      } else if (this.crashNumber > 5.7 && this.speed.logic === 6) {
        this.speed.use = "0.07";
        this.speed.logic = 7;
        clearInterval(this.streamCrash);
        this.streamCrashF(80);
      } else if (this.crashNumber > 10.7 && this.speed.logic === 7) {
        this.speed.use = "0.08";
        this.speed.logic = 8;
        clearInterval(this.streamCrash);
        this.streamCrashF(60);
      } else if (this.crashNumber > 30.7 && this.speed.logic === 8) {
        this.speed.use = "0.15";
        this.speed.logic = 9;
        clearInterval(this.streamCrash);
        this.streamCrashF(50);
      } else {
        this.crashStreaming();
      }

      // crashStreaming();
    }

    //console.log(typeof crashNumber, crashNumber);
  },
  streamCrashF: function (timing = 200) {
    this.streamCrash = setInterval(() => {
      this.crashRunner();
    }, timing);
  },
  streamTimerF: function () {
    let timer = this.timer;
    this.betTime = true;
    this.streamTimer = setInterval(() => {
      timer++;
      this.timer++;
      this.broadcast({ type: "timer", timer: timer });
      // this.broadcast({ type: "betData", betData: this.betData });
      // io.emit("timer", encrypt({ timer: timer }));
      if (timer >= 11) {
        clearInterval(this.streamTimer);
        this.betTime = false;
        this.streamCrashF();
        this.timer = -1;
        this.crashNumber = new Decimal("0.99");
        this.generateRandomCrash();
      }
    }, 600);
  },
  thisRound: {
    crash: 0,
    crashed: false,
    hash: null,
  },
  clients: new Map(),
  crashNumber: new Decimal("0.99"),
  streamCrash: "",
  streamTimer: "",
  speed: {
    use: "0.01",
    logic: 1,
  },
  betTime: false,
  timer: -1,
};
