import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const passwordHistorySchema = new mongoose.Schema({
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    passwordHistory: [passwordHistorySchema], // Store password history
    passwordExpiry: { type: Date }, // Password expiry date
    isAdmin: { type: Boolean, required: true, default: false },
    isSeller: { type: Boolean, required: true, default: false },
    is2FAEnabled: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    loginAttempts: { type: Number, default: 0 }, // Track login attempts
    lockUntil: { type: Date }, // Lock account until this time
    seller: {
      name: { type: String, required: false },
      logo: { type: String, required: false },
      description: { type: String, required: false },
      rating: { type: Number, default: 0, required: true },
      reviews: { type: Number, default: 0, required: true },
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // Check password complexity
  const passwordRegex =
    /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[^\w\s]).{8,}$/;
  if (!passwordRegex.test(this.password)) {
    throw new Error(
      "Password must be at least 8 characters long and contain at least one uppercase, lowercase letter, number, and special character."
    );
  }

  // Check if password is reused
  const isReused = this.passwordHistory.some((entry) =>
    bcrypt.compareSync(this.password, entry.password)
  );
  if (isReused) {
    throw new Error("You cannot reuse a recent password.");
  }

  // Hash the password
  this.password = await bcrypt.hash(this.password, 10);

  // Add to password history
  this.passwordHistory.push({ password: this.password });

  // Set password expiry (e.g., 90 days from now)
  this.passwordExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

const User = mongoose.model("User", userSchema);

export default User;