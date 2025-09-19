import { configDotenv } from "dotenv"
import express from "express"
import mongoose from "mongoose";
import Build from "./models/Build.js";
import { connectDB } from "./config/connectDB.js";

configDotenv()
const app = express()

// Middleware
app.use(express.json())
app.use(express.static('public'))

connectDB()

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
})