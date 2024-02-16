const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { Decimal } = require("decimal.js");
const CryptoJS = require("crypto-js");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const io = new WebSocket.Server({ server });
app.get("/", (req, res) => {
  res.send("<h1>Hello world</h1>");
});
// const io = socketIo(server, {
//   cors: {
//     origin: "http://localhost:3000",
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
//   allowEIO4: true,
// });
const clients = new Set();

let crashNumber = new Decimal("0.99");

let streamCrash,
  streamTimer,
  speed = {
    use: "0.01",
    logic: 1,
  };

// Socket.io server setup...
io.on("connection", (socket) => {
  clients.add(socket);
  socket.on("close", function close() {
    // Remove the WebSocket connection from the set
    clients.delete(socket);
  });
  socket.on("cashout", () => {
    crashNumber = new Decimal("0.99");
    console.log("Cashout Requested");
  });
});

io.on("error", (error) => {
  console.error("Socket.io error:", error);
});

function broadcast(message) {
  message = encrypt(message);
  clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

//game socket

const thisRound = {
  crash: 0,
  crashed: false,
};

const getRandomNumber = (min, max, decimalPlaces) => {
  // Generate a random number between min and max (inclusive)
  let randomNumber = Math.random() * (max - min) + min;

  // Round the number to the specified decimal places
  if (decimalPlaces !== undefined) {
    const factor = Math.pow(10, decimalPlaces);
    randomNumber = Math.round(randomNumber * factor) / factor;
  }

  return randomNumber;
};

const encrypt = (object) => {
  // Encryption
  const obj = object;
  const jsonString = JSON.stringify(obj);
  const key = "secret key";
  const encryptedData = CryptoJS.AES.encrypt(jsonString, key).toString();
  return encryptedData;
};

const generateRandomCrash = () => {
  if (thisRound.crashed) {
    // Example usage:
    const min = 1.0;
    const max = 2.0;
    const decimalPlaces = 2;
    const randomNumber = getRandomNumber(min, max, decimalPlaces);

    thisRound.crashed = false;
    broadcast({ type: "crashed", crashed: thisRound.crashed });
    // io.emit("crashed", encrypt({ crashed: thisRound.crashed }));
    thisRound.crash = randomNumber;
  }
};

const crashStreaming = () => {
  let adding = new Decimal(speed.use);
  crashNumber = crashNumber.plus(adding);
  broadcast({ type: "crash", crash: crashNumber });
  // console.log(crashNumber);
  // io.emit("crash", encrypt({ crash: crashNumber }));
};

const crashRunner = () => {
  if (thisRound.crash <= crashNumber) {
    thisRound.crashed = true;
    speed.use = "0.01";
    speed.logic = 1;
    broadcast({ type: "crashed", crashed: thisRound.crashed });
    // io.emit("crashed", encrypt({ crashed: thisRound.crashed }));
    clearInterval(streamCrash);
    streamTimerF();
  } else {
    if (crashNumber > 1.1 && speed.logic === 1) {
      // speed.use = "0.02";
      speed.logic = 2;
      clearInterval(streamCrash);
      streamCrashF(180);
    } else if (crashNumber > 1.3 && speed.logic === 2) {
      speed.use = "0.01";
      speed.logic = 3;
      clearInterval(streamCrash);
      streamCrashF(150);
    } else if (crashNumber > 1.6 && speed.logic === 3) {
      speed.use = "0.04";
      speed.logic = 4;
      clearInterval(streamCrash);
      streamCrashF(120);
    } else if (crashNumber > 2.1 && speed.logic === 4) {
      speed.use = "0.05";
      speed.logic = 5;
      clearInterval(streamCrash);
      streamCrashF(120);
    } else if (crashNumber > 3.7 && speed.logic === 5) {
      speed.use = "0.06";
      speed.logic = 6;
      clearInterval(streamCrash);
      streamCrashF(100);
    } else if (crashNumber > 5.7 && speed.logic === 6) {
      speed.use = "0.07";
      speed.logic = 7;
      clearInterval(streamCrash);
      streamCrashF(80);
    } else if (crashNumber > 10.7 && speed.logic === 7) {
      speed.use = "0.08";
      speed.logic = 8;
      clearInterval(streamCrash);
      streamCrashF(60);
    } else {
      crashStreaming();
    }

    // crashStreaming();
  }

  //console.log(typeof crashNumber, crashNumber);
};

const streamCrashF = (timing = 300) => {
  streamCrash = setInterval(() => {
    crashRunner();
  }, timing);
};

const streamTimerF = () => {
  let timer = -1;
  streamTimer = setInterval(() => {
    timer++;
    broadcast({ type: "timer", timer: timer });
    // io.emit("timer", encrypt({ timer: timer }));
    if (timer >= 11) {
      clearInterval(streamTimer);
      streamCrashF();
      crashNumber = new Decimal("0.99");
      generateRandomCrash();
    }
  }, 1000);
};

streamCrashF(); //initial start
server.listen(3001, () => {
  console.log("Server is running on port 3000");
});
