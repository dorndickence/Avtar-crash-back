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
const app = express();
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

app.post("/register", (req, res) => {
  user.register(req, res);
});
app.post("/login", (req, res) => {
  // console.log(req);
  user.login(req, res);
});

io.on("connection", (socket) => {
  game.clients.add(socket);
  socket.on("close", function close() {
    // Remove the WebSocket connection from the set
    game.clients.delete(socket);
  });
  socket.on("cashout", () => {
    game.crashNumber = new Decimal("0.99");
    console.log("Cashout Requested");
  });
});
io.on("error", (error) => {
  console.error("Socket.io error:", error);
});

// game.streamCrashF(); //initial start
server.listen(3001, () => {
  console.log("Server is running on port 3000");
});
