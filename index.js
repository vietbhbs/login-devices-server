const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const app = express();
const http = require('http');
const {Server} = require("socket.io");
const server = http.createServer(app);
const io = new Server(server);
const device = require('express-device');
const {logOut} = require("./controllers/userController");
require("dotenv").config();

app.use(cors());
app.use(express.json());
app.use(device.capture());

mongoose
    .connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log("DB Connetion Successfull");
    })
    .catch((err) => {
        console.log(err.message);
    });

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

io.on('connection', (socket) => {
    socket.on('logout all device', (refreshToken) => {
        logOut(
            {
                path: '/logout-all',
                body: {
                    refreshToken: refreshToken
                }
            }
        ).then(() => {
            io.emit('devices logout', 'devices logout');
        });
    })
    socket.on('logout device', (refreshToken) => {
        logOut(
            {
                path: '/logout',
                body: {
                    refreshToken: refreshToken
                }
            }
        ).then(() => {
            io.emit('device logout', 'device logout');
        });
    })
});

server.listen(5050, () => {
    console.log('listening on *:5050');
});
