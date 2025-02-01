// import OTP  from "../models/userModel.js"

import OTP from "../models/otpModel.js"
import nodemailer from 'nodemailer'

// Generate OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Store OTP in the database
export const storeOTP = async (email, otp, type) => {
  await OTP.create({ email, otp, type })
}

// Send OTP via email
export const sendOTP = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "OTP for Verification",
    text: `Your OTP is: ${otp}`,
  }

  await transporter.sendMail(mailOptions)
}
