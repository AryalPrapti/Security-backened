import cors from "cors"
import dotenv from "dotenv"
import express from "express"
import fs from "fs"
import https from "https" // Import HTTPS module
import mongoose from "mongoose"
import morgan from "morgan"
import path from "path"
import { Server } from "socket.io"
import { fileURLToPath } from "url"

import ExpressMongoSanitize from "express-mongo-sanitize"
import session from "express-session"
import helmet from "helmet"
import hpp from "hpp"
import { logger } from "./middleware/logger.js"
import Auction from "./models/auctionModel.js"
import auctionRouter from "./routes/auctionRoutes.js"
import orderRouter from "./routes/orderRoutes.js"
import productRouter from "./routes/productRoutes.js"
import seedRouter from "./routes/seedRoutes.js"
import uploadRouter from "./routes/uploadRoutes.js"
import userRouter from "./routes/userRoutes.js"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Middleware setup
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const corsPolicy = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    const allowedOrigins = ["https://localhost:3000"]
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg =
        "The CORS policy for this site does not allow access from the specified Origin."
      return callback(new Error(msg), false)
    }
    return callback(null, true)
  },
  credentials: true,
  optionsSuccessStatus: 200,
}
app.use(cors(corsPolicy))

// Security middleware with enhanced headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: null, // Forces HTTPS
        baseUri: ["'none'"], // Restricts base URI injections
        manifestSrc: ["'self'"],
      },
    },
    // Cross-Origin settings
    crossOriginEmbedderPolicy: false, // Prevents loading cross-origin resources
    crossOriginOpenerPolicy: { policy: "same-origin" }, // Controls cross-origin popups
    crossOriginResourcePolicy: { policy: "same-site" }, // Controls resource sharing

    // Additional security headers
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true, // Prevents MIME type sniffing
    frameguard: { action: "deny" }, // Prevents clickjacking
    hidePoweredBy: true, // Removes X-Powered-By header
    dnsPrefetchControl: { allow: false }, // Controls DNS prefetching
    ieNoOpen: true, // Prevents IE from executing downloads
    originAgentCluster: true, // Enables Origin isolation
  })
)

// additional custom security headers
app.use((req, res, next) => {
  // Allow credentials in headers
  res.setHeader("Access-Control-Allow-Credentials", "true")

  // Ensure CORS headers are present
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-csrf-token, x-xsrf-token"
  )

  next()
})

// Prevent HTTP Parameter Pollution attacks
app.use(
  hpp({
    whitelist: [], // any parameters that are allowed to be duplicated
  })
)

// MongoDB sanitization with enhanced options
app.use(
  ExpressMongoSanitize({
    replaceWith: "_",
    onSanitize: ({ req, key }) => {
      console.warn(`This request[${key}] is sanitized`, req)
    },
  })
)
app.options("*", cors())
app.use(morgan("dev"))

// PayPal API
app.get("/api/keys/paypal", (req, res) => {
  res.send(process.env.PAYPAL_CLIENT_ID || "sandbox")
})

// SSL certificate configuration
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, "server.key")),
  cert: fs.readFileSync(path.join(__dirname, "server.crt")),
  requestCert: false,
  rejectUnauthorized: false,
}

app.get("/", (req, res) => {
  res.send("Hello, Secure World!")
})

// Routes
app.use("/api/seed", seedRouter)
app.use("/api/upload", uploadRouter)
app.use("/uploads", express.static(path.join(__dirname, "uploads")))
app.use("/api/products", productRouter)
app.use("/api/users", userRouter)
app.use("/api/orders", orderRouter)
app.use("/api/auctions", auctionRouter)

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).send({ message: err.message })
})

// Database connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("[DB] Connection Success")
  })
  .catch((err) => {
    logger.error(err.message)
    console.log(err.message)
  })

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    name: "sessionId",
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
      path: "/",
    },
    resave: false,
    saveUninitialized: false,
  })
)

// Session cleanup middleware
const sessionCleanup = async (req, res, next) => {
  if (req.session && req.session.lastActivity) {
    const currentTime = Date.now()
    const inactivityPeriod = currentTime - req.session.lastActivity

    if (inactivityPeriod > 30 * 60 * 1000) {
      // 30 minutes
      await req.session.destroy()
      return res.status(440).json({ error: "Session expired" })
    }
    req.session.lastActivity = currentTime
  }
  next()
}

app.use(sessionCleanup)

// Create HTTPS server
const port = process.env.PORT || 5000
const server = https.createServer(sslOptions, app) // Use HTTPS module

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

io.on("connection", (socket) => {
  socket.on("joinAuction", async (auctionId) => {
    try {
      const auction = await Auction.findById(auctionId)
      if (!auction) {
        console.log(`[Socket] Auction not found ${auctionId}`)
        socket.emit("auctionError", { message: "Auction not found" })
      } else {
        console.log(`[Socket] Joining auction ${auctionId}`)
        socket.join(auctionId)
        socket.emit("auctionData", auction)
      }
    } catch (error) {
      console.log(
        `[Socket] Error joining auction ${auctionId}: ${error.message}`
      )
      socket.emit("auctionError", { message: "Server Error" })
    }
  })

  socket.on("leaveAuction", (auctionId) => {
    console.log(`[Socket] Leaving auction ${auctionId}`)
    socket.leave(auctionId)
  })

  socket.on("placeBid", async ({ auctionId, bidder, bidAmount }) => {
    try {
      const auction = await Auction.findById(auctionId)
      if (!auction) {
        console.log(`[Socket] Auction not found ${auctionId}`)
        socket.emit("auctionError", { message: "Auction not found" })
        return
      }

      if (bidAmount <= auction.currentBid) {
        console.log(
          `[SocketIO] Bid must be greater than current bid: ${bidAmount}`
        )
        return
      }

      if (auction.endDate === 0) {
        console.log(`[SocketIO] Auction has ended: ${auctionId}`)
        return
      }

      auction.bids.push({ bidder: "Anonymous", bidAmount: bidAmount })
      auction.currentBid = bidAmount

      const updatedAuction = await auction.save()
      io.to(auctionId).emit("bidUpdated", updatedAuction)
    } catch (error) {
      console.error(error)
    }
  })

  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected`)
  })
})

// Start HTTPS Server
server.listen(port, () => {
  logger.info(`HTTPS Server running at port: ${port}`)
  console.log(`🚀 HTTPS Server running at port: ${port}`)
})

export { io, server }
