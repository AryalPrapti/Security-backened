import express from "express"
import fs from "fs"
import multer from "multer"
import { isAdmin, isAuth } from "../utils.js"

// Set storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/"
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  },
})

const upload = multer({ storage })

const uploadRouter = express.Router()

uploadRouter.post("/", isAuth, isAdmin, upload.single("file"), (req, res) => {
  const filePath = req.file.path.replace(/\\/g, "/") // Ensure forward slashes in file path
  res.send({ filePath })
})

export default uploadRouter
