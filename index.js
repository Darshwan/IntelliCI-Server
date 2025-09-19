import { configDotenv } from "dotenv"
import express from "express"
import Build from "./models/Build.js";
import { connectDB } from "./config/connectDB.js";
import buildRoutes from "./routes/build.routes.js";
import webHookRoutes from "./routes/webhook.route.js";


configDotenv()
const app = express()

// Middleware
app.use(express.json())
app.use(express.static('public'))

connectDB()
// Body parser must come *before* webhook routes!
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf } }));
// Test route to manually trigger a build and check status
app.use('/api', buildRoutes)
app.use('/webhook', webHookRoutes)

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
})