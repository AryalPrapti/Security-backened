// controllers/userController.js

import bcrypt from "bcryptjs"
import expressAsyncHandler from "express-async-handler"
import rateLimit from "express-rate-limit"
import jwt from "jsonwebtoken"
import nodemailer from "nodemailer"
import OTP from "../models/otpModel.js"
import User from "../models/userModel.js"
import { generateRefreshToken, generateToken } from "../utils.js"
import { generateOTP } from "../utils/otputils.js"
import { logActivity } from "./activityLogController.js"
// Get all users
export const getAllUsers = expressAsyncHandler(async (req, res) => {
  const users = await User.find({})
  res.send(users)
})

// Get user by ID
export const getUserById = expressAsyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (user) {
    res.send(user)
  } else {
    res.status(404).send({ message: "User Not Found" })
  }
})

// Update user
export const updateUser = expressAsyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (user) {
    user.name = req.body.name || user.name
    user.email = req.body.email || user.email
    user.isAdmin = Boolean(req.body.isAdmin)
    user.isSeller = Boolean(req.body.isSeller)

    // Check if the user is a seller before updating seller information
    if (user.isSeller && user.seller) {
      user.seller.name = req.body.sellerName || user.seller.name
      user.seller.logo = req.body.sellerLogo || user.seller.logo
      user.seller.description =
        req.body.sellerDescription || user.seller.description
    }

    const updatedUser = await user.save()
    res.send({ message: "User Updated Successfully", user: updatedUser })
  } else {
    res.status(404).send({ message: "User Not Found" })
  }
})

// Delete user
export const deleteUser = expressAsyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (user) {
    if (user.email === "admin@example.com") {
      res.status(400).send({ message: "Can Not Delete Admin User" })
      return
    }
    await User.findByIdAndDelete(req.params.id)
    res.send({ message: "User Deleted" })
  } else {
    res.status(404).send({ message: "User Not Found" })
  }
})

// User sign in
// export const signIn = expressAsyncHandler(async (req, res) => {
//   const user = await User.findOne({ email: req.body.email })
//   if (user) {
//     if (bcrypt.compareSync(req.body.password, user.password)) {
//       res.send({
// user: {
//   _id: user._id,
//   name: user.name,
//   email: user.email,
//   isAdmin: user.isAdmin,
//   isSeller: user.isSeller,
//   seller: user.seller,
// },
//         token: generateToken(user),
//         success: true,
//       })
//       return
//     }
//   }
//   res.status(401).send({ success: false, message: "Invalid Email/Password" })
// })

// // User sign up
// export const signUp = expressAsyncHandler(async (req, res) => {
//   const newUser = new User({
//     name: req.body.name,
//     email: req.body.email,
//     password: bcrypt.hashSync(req.body.password),
//     seller: {
//       name: req.body.sellerName,
//       logo: req.body.sellerLogo,
//       description: req.body.sellerDescription,
//     },
//   })

//   const user = await newUser.save()
//   res.send({
//     _id: user._id,
//     name: user.name,
//     email: user.email,
//     isAdmin: user.isAdmin,
//     isSeller: user.isSeller,
//     seller: user.seller,
//     token: generateToken(user),
//   })
// })

// Update user profile
export const updateUserProfile = expressAsyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  if (user) {
    user.name = req.body.name || user.name
    user.email = req.body.email || user.email
    if (req.body.password) {
      user.password = bcrypt.hashSync(req.body.password, 8)
    }
    if (user.isSeller) {
      user.seller.name = req.body.sellerName || user.seller.name
      user.seller.logo = req.body.sellerLogo || user.seller.logo
      user.seller.description =
        req.body.sellerDescription || user.seller.description
    }

    const updatedUser = await user.save()
    res.send({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      isSeller: updatedUser.isSeller,
      token: generateToken(updatedUser),
    })
  } else {
    res.status(404).send({ message: "User not found" })
  }
})

// Store failed attempts, OTPs & Refresh Tokens
const failedLoginAttempts = new Map()
const otpStore = new Map()
const refreshTokens = new Map()

// Rate limiter for brute-force protection
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: "Too many login attempts, please try again later.",
})

// Nodemailer setup for sending OTPs
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "aryalpriya9@gmail.com",
    pass: process.env.EMAIL_PASS || "biht dvnc aixc mpsi",
  },
})

// Secure User Sign-up
export const signUp = expressAsyncHandler(async (req, res) => {
  const { name, email, password } = req.body
  const ip = req.ip

  // Enforce strong password policy
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).{8,}$/
  if (!passwordRegex.test(password)) {
    return res.status(400).send({
      message:
        "Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.",
    })
  }

  const existingUser = await User.findOne({ email })
  if (existingUser) {
    return res.status(400).send({ message: "User already exists." })
  }

  const hashedPassword = bcrypt.hashSync(password, 8)
  const newUser = new User({ name, email, password: hashedPassword })
  const user = await newUser.save()
  await logActivity(user._id, "User Registered", ip)

  res.send({
    _id: user._id,
    name: user.name,
    email: user.email,
    token: generateToken(user),
    refreshToken: generateRefreshToken(user),
  })
})

export const sendVerificationOTP = async (req, res) => {
  const { email } = req.body
  const ip = req.ip

  // Check if user exists
  const user = await User.findOne({ email })
  if (!user) {
    return res.status(404).send({ message: "User not found." })
  }

  // Generate OTP
  const otp = generateOTP()

  // Store OTP in the database
  await OTP.create({ email, otp, type: "verification" })

  // Send OTP via email
  const mailOptions = {
    from: process.env.EMAIL_USER || "aryalpriya9@gmail.com",
    to: email,
    subject: "Verification Code",
    text: `Your verification code is: ${otp}`,
  }

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error)
      return res.status(500).send({ message: "Failed to send OTP." })
    }
    console.log("OTP sent:", info.response)
    res.send({ message: "OTP sent successfully." })
  })

  await logActivity(user._id, "Verification Code Sent", ip)
}
// Function to send OTP via email
const sendOTPByEmail = async (email, otp, otpType) => {
  const mailOptions = {
    from: process.env.EMAIL_USER || "aryalpriya9@gmail.com",
    to: email,
    subject:
      otpType === "verification"
        ? "Verification Code"
        : "Two-Factor Authentication OTP",
    text: `Your ${
      otpType === "verification" ? "verification code" : "2FA OTP"
    } is: ${otp}`,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`${otpType} OTP sent to ${email}`)
    return true // Return true if OTP sent successfully
  } catch (error) {
    console.error(`Failed to send ${otpType} OTP to ${email}:`, error)
    return false // Return false if OTP sending fails
  }
}

export const send2faotp = async (req, res) => {
  const { email } = req.body
  const ip = req.ip

  // Check if user exists
  const user = await User.findOne({ email })
  if (!user) {
    return res.status(404).send({ message: "User not found." })
  }

  // Generate OTP
  const otp = generateOTP()

  // Store OTP in the database
  await OTP.create({ email, otp, type: "2fa" })

  // Send OTP via email
  const mailOptions = {
    from: process.env.EMAIL_USER || "aryalpriya9@gmail.com",
    to: email,
    subject: "Two-Factor Authentication OTP",
    text: `Your two-factor authentication OTP is: ${otp}`,
  }

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error)
      return res.status(500).send({ message: "Failed to send OTP." })
    }
    console.log("OTP sent:", info.response)
    res.send({ message: "OTP sent successfully." })
  })

  await logActivity(user._id, "Two-Factor Authentication OTP Sent", ip)
}

export const checkPasswordExpiry = async (req, res, next) => {
  const user = await User.findById(req.user._id)
  if (user.passwordExpiry && user.passwordExpiry < Date.now()) {
    return res.status(403).json({
      message: "Your password has expired. Please reset your password.",
    })
  }
  next()
}

export const signIn = async (req, res) => {
  const { email, password } = req.body
  const ip = req.ip

  try {
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(403).json({
        message: "Account locked. Try again in 15 mins.",
      })
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      user.loginAttempts += 1
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
      }
      await user.save()
      return res.status(401).json({ message: "Invalid password" })
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0
    user.lockUntil = null
    await user.save()

    // Check if email is not verified
    if (!user.isVerified) {
      // Send verification OTP
      const otp = generateOTP()
      await OTP.create({ email, otp, type: "verification" })
      const otpSent = await sendOTPByEmail(email, otp, "verification")

      if (!otpSent) {
        return res
          .status(500)
          .json({ message: "Failed to send verification OTP" })
      }

      return res.status(200).json({
        data: "EMAIL_NOT_VERIFIED",
        message: "Email not verified. Verification OTP sent.",
      })
    }

    // Check if 2FA is enabled
    if (user.is2FAEnabled) {
      // Send 2FA OTP
      const otp = generateOTP()
      await OTP.create({ email, otp, type: "2fa" })
      const otpSent = await sendOTPByEmail(email, otp, "2FA")

      if (!otpSent) {
        return res.status(500).json({ message: "Failed to send 2FA OTP" })
      }

      return res.status(200).json({
        data: "2FA_ENABLED",
        message: "2FA is enabled. Please enter the OTP sent to your email.",
      })
    }

    // If no 2FA and email is verified, log in the user directly
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    })

    res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isSeller: user.isSeller,
      },
      token,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error", error: error.message })
  }
}
// Token Refresh Endpoint
export const refreshToken = expressAsyncHandler(async (req, res) => {
  const { token } = req.body
  if (!refreshTokens.has(token)) {
    return res.status(403).send({ message: "Invalid refresh token" })
  }

  const userId = refreshTokens.get(token)
  const user = await User.findById(userId)
  if (!user) {
    return res.status(403).send({ message: "User not found" })
  }

  res.send({
    token: generateToken(user),
  })
})

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body

  try {
    // Find the user by email
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Find the stored OTP for the email
    const storedOTP = await OTP.findOne({ email, otp })
    if (!storedOTP) {
      return res.status(400).json({ message: "Invalid OTP" })
    }

    // Case 1: User is not verified (email verification)
    if (!user.isVerified) {
      if (storedOTP.type !== "verification") {
        return res
          .status(400)
          .json({ message: "Invalid OTP type for verification" })
      }

      // Mark user as verified
      user.isVerified = true
      await user.save()

      // Delete the OTP after successful verification
      await OTP.deleteOne({ _id: storedOTP._id })

      return res.status(200).json({success:true, message: "Email verified successfully" })
    }

    // Case 2: User is verified and 2FA is enabled
    if (user.is2FAEnabled) {
      if (storedOTP.type !== "2fa") {
        return res.status(400).json({ message: "Invalid OTP type for 2FA" })
      }

      // Delete the OTP after successful 2FA verification
      await OTP.deleteOne({ _id: storedOTP._id })

      // Generate a JWT token for login
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      })

      return res.status(200).json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          isSeller: user.isSeller,
          seller: user.seller,
        },
        token,
        success: true,
        message: "Loggedin successfully",
      })
    }

    // If none of the above cases match
    return res.status(400).json({ message: "Invalid OTP request" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error", error: error.message })
  }
}

// User Logout - Invalidate Refresh Token
export const logout = expressAsyncHandler(async (req, res) => {
  const { token } = req.body
  const ip = req.ip
  if (refreshTokens.has(token)) {
    refreshTokens.delete(token)
  }
  await logActivity(req.user._id, "User Logged Out", ip)
  res.send({ message: "User logged out successfully." })
})
