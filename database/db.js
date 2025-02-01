// db.js
import dotenv from "dotenv"
import mongoose from "mongoose"

dotenv.config()

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log("[DB] Connection Success")
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

export default connectDB
