import { configDotenv } from "dotenv"
import express from "express"
import Build from "./models/Build.js";
import { connectDB } from "./config/connectDB.js";
import buildRoutes from "./routes/build.routes.js";
import webHookRoutes from "./routes/webhook.route.js";
import { Server as SocketIOServer } from "socket.io";
import http from 'http'

configDotenv()
const app = express()
const server = http.createServer(app)

export const io = new SocketIOServer(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// Connect to database first
connectDB()

// Middleware
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf } }));
app.use(express.static('public')) // ← Move static files BEFORE API routes

// Routes
app.use('/api', buildRoutes)
app.use('/webhook', webHookRoutes)

// Socket.io connection Handler
io.on('connection', (socket) => {
    console.log('client connected: ', socket.id)

    socket.on('disconnect', () => {
        console.log('Client Disconnected: ', socket.id)
    })

    socket.on('request-builds', async () => {
        try {
            const builds = await Build.find().sort({ createdAt: -1 }).limit(10);
            socket.emit('build-history', builds);
        } catch (error) {
            console.error('Error sending build history:', error);
        }
    });
})

app.locals.io = io;

server.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
})

// ✅ Correct ES Modules export
export { app, server };