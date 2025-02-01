import ActivityLogModel from "../models/activityModel.js"

export const logActivity = async (userId, action, ip) => {
  await ActivityLogModel.create({ userId, action, ip })
}
