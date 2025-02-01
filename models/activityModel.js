import mongoose from "mongoose"

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    ip: { type: String },
  },
  { timestamps: true }
)

const ActivityLogModel = mongoose.model("ActivityLog", activityLogSchema)

export default ActivityLogModel
