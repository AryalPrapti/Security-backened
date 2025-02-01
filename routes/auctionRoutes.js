// routes/auctionRouter.js

import express from "express"
import {
  createAuction,
  deleteAuctionById,
  getAllAuctions,
  getAuctionById,
  placeBid,
} from "../controllers/auctionController.js"
import { isAdmin, isAuth, isSeller } from "../utils.js"

const auctionRouter = express.Router()

// Create new auction
auctionRouter.post("/", isAuth, isSeller, createAuction)

// Get all auctions
auctionRouter.get("/", getAllAuctions)

// Get a specific auction
auctionRouter.get("/:id", isAuth, getAuctionById)

// Place a bid on an auction
auctionRouter.post("/:id/bids", isAuth, placeBid)

// DELETE auction by ID
auctionRouter.delete("/:id", isAuth, isAdmin, deleteAuctionById)

export default auctionRouter
