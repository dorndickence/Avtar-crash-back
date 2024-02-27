const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { Decimal } = require("decimal.js");
const CryptoJS = require("crypto-js");
const WebSocket = require("ws");
const cors = require("cors");
const { mongoose } = require("mongoose");
const game = require("./game/gameFunction");
const user = require("./users/user");
const partner = require("./partners/partner");
const app = express();
const livebet = require("./users/livebet");
const trans = require("./users/trans");
const history = require("./users/history");
const cron = require("./users/cron");
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true, //access-control-allow-credentials:true
    optionSuccessStatus: 200,
  })
);
app.use(express.json());
const server = http.createServer(app);
const io = new WebSocket.Server({ server });

try {
  const connected = mongoose.connect(
    "mongodb+srv://ronysarker135:Rony2Sarker@cluster0.vbnhieb.mongodb.net/?retryWrites=true&w=majority"
  );
  if (connected) {
    console.log("connected mongodb");
  }
} catch (error) {
  throw error;
}

//partner
app.post("/partner/register", (req, res) => {
  partner.register(req, res);
});
app.post("/partner/login", (req, res) => {
  partner.login(req, res);
});
//partner end

app.post("/register", (req, res) => {
  user.register(req, res);
});

app.post("/login", (req, res) => {
  // console.log(req);
  user.login(req, res);
});
app.post("/balance", (req, res) => {
  user.balance(req, res);
});
app.post("/bet", (req, res) => {
  user.bet(req, res);
});
app.post("/cashout", (req, res) => {
  user.cashout(req, res);
});
app.post("/betlive", (req, res) => {
  livebet.getlivebet(req, res);
});
app.post("/deposit", (req, res) => {
  trans.deposit(req, res);
});
app.post("/withdraw", (req, res) => {
  trans.withdraw(req, res);
});
app.post("/deposit-history", (req, res) => {
  history.deposit(req, res);
});
app.post("/withdraw-history", (req, res) => {
  history.withdraw(req, res);
});
app.post("/game-history", (req, res) => {
  history.game(req, res);
});
app.get("/cron-deposit", (req, res) => {
  cron.deposit(res);
});

app.post("/depositCheck", (req, res) => {
  trans.depositCheck(req, res);
});

io.on("connection", async (socket, req) => {
  // check existing connection and deactivate them
  const userId = parseInt(req.url.split("=")[1]);

  if (game.clients.has(userId)) {
    const ExisitngSocket = game.getWebSocketByUserId(userId);
    ExisitngSocket.close();
    game.clients.delete(game.getUserIdByWebSocket(ExisitngSocket));
  }

  // const prevClientKey = Array.from(game.clients.keys()).pop();
  const assignNumber = game.findMissingNumbers(Array.from(game.clients.keys()));

  // let newClientKey = prevClientKey;
  // if (prevClientKey !== undefined) {
  //   newClientKey++;
  // } else {
  //   newClientKey = 0;
  // }

  game.clients.set(assignNumber, socket);

  //senduserid to connected user only
  game.broadcast({ type: "socketuserId", data: assignNumber }, socket);
  // console.log(Array.from(game.clients.keys()));
  socket.on("close", function close() {
    // Remove the WebSocket connection from the set
    if (game.getUserIdByWebSocket(socket) !== null) {
      game.clients.delete(game.getUserIdByWebSocket(socket));
    }
  });
});
io.on("error", (error) => {
  console.error("Socket.io error:", error);
});

game.streamCrashF(); //initial start
server.listen(3001, () => {
  console.log("Server is running on port 3001");
});
