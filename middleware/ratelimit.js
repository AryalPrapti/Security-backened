import rateLimit from "express-rate-limit";


// Rate limiter for brute-force protection
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:25, // Limit each IP to 25  attempts per windowMs
  message: "Too many  attempts, please try again later.",
})