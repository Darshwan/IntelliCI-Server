import { configDotenv } from "dotenv"
import express from "express"
import Build from "./models/Build.js";
import { connectDB } from "./config/connectDB.js";
import buildRoutes from "./routes/buildRoutes.js";


configDotenv()
const app = express()

// Middleware
app.use(express.json())
app.use(express.static('public'))

connectDB()

// Test route to manually trigger a build and check status
app.use('/api', buildRoutes)

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
})