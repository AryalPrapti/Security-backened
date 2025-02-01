import winston from "winston"
import WinstonMongoDB from "winston-mongodb" // Use require for CommonJS modules
import dotenv from "dotenv" //

dotenv.config()
// MongoDB transport
const mongoTransport = new WinstonMongoDB.MongoDB({
  level: "info", // Log level
  db: process.env.MONGODB_URI, // MongoDB connection string
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  collection: "logs", // Collection name
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
})

// File transport for server errors and logs
const fileTransport = new winston.transports.File({
  filename: "./logs/server.log", // Log file name
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
})

// Create a Winston logger instance
export const logger = winston.createLogger({
  transports: [mongoTransport, fileTransport],

})

// Middleware function to log user actions with user details
export const logUserAction = (req, res, next) => {
  // Extract user details from the request object (adjust as per your application's user structure)
  const user = req.user // Assuming req.user contains authenticated user details
  const userId = user ? user._id : "anonymous"

  logger.info("User action", {
    userId: userId,
    username: user ? user.username : "anonymous",
    method: req.method,
    path: req.path,
    userAgent: req.headers["user-agent"],
    ip: req.ip,
    timestamp: new Date().toISOString(),
  })
  next()
}
