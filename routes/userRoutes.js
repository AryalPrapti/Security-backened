import express from "express";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  send2faotp,
  sendVerificationOTP,
  signIn,
  signUp,
  updateUser,
  updateUserProfile,
  verifyOTP,
} from "../controllers/userController.js";
import { isAdmin, isAuth } from "../utils.js";
import User from "../models/userModel.js";
import { logUserAction } from "../middleware/logger.js";

const userRouter = express.Router();

// Middleware to log user actions after authentication
userRouter.post("/verifyOTP", verifyOTP);
userRouter.post("/signin", signIn);
userRouter.post("/signup", signUp);
userRouter.post("/send-2fa-otp", send2faotp);
userRouter.post("/send-verification-otp", sendVerificationOTP);

userRouter.use(isAuth, logUserAction);

userRouter.get("/", isAdmin, getAllUsers);
userRouter.get("/:id", isAdmin, getUserById);
userRouter.put("/:id", isAdmin, updateUser);
userRouter.delete("/:id", isAdmin, deleteUser);
userRouter.put("/profile/:id", isAuth, updateUserProfile);
userRouter.put("/toggle-2fa/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.is2FAEnabled = req.body.is2FAEnabled;
    await user.save();

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

export default userRouter;
