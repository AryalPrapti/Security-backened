import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ['verification', '2fa'], required: true }, // OTP type
  createdAt: { type: Date, default: Date.now, expires: '15m' }, // OTP expires in 15 minutes
});

const OTP = mongoose.model('OTP', otpSchema);

export default OTP