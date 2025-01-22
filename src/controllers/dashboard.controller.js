import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // console.log(`Fetching stats for channel ID: ${channelId}`);

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  try {
    const stats = await Video.aggregate([
      { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: "$views" },
        },
      },
    ]);

    const totalSubscribers = await Subscription.countDocuments({ channel: channelId });
    const totalLikes = await Like.countDocuments({ channel: channelId });

    const result = {
      totalVideos: stats[0]?.totalVideos || 0,
      totalViews: stats[0]?.totalViews || 0,
      totalSubscribers,
      totalLikes,
    };

    // console.log(`Stats for channel ID ${channelId}:`, result);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Channel stats retrieved successfully"));
  } catch (error) {
    // console.error(`Error fetching stats for channel ID ${channelId}:`, error);
    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    return res
      .status(statusCode)
      .json(new ApiResponse(statusCode, "Failed to retrieve channel stats", error.message));
  }
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // console.log(`Fetching videos for channel ID: ${channelId}`);

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  try {
    const videos = await Video.aggregate([
      { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes",
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          views: 1,
          likes: { $size: "$likes" },
          createdAt: 1,
        },
      },
    ]);

    if (!videos || videos.length === 0) {
      // console.log(`No videos found for channel ID ${channelId}`);
      return res
        .status(404)
        .json(new ApiResponse(404, [], "No videos found for this channel"));
    }

    // console.log(`Videos for channel ID ${channelId}:`, videos);

    return res
      .status(200)
      .json(new ApiResponse(200, videos, "Channel videos retrieved successfully"));
  } catch (error) {
    // console.error(`Error fetching videos for channel ID ${channelId}:`, error);
    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    return res
      .status(statusCode)
      .json(new ApiResponse(statusCode, "Failed to retrieve channel videos", error.message));
  }
});

export { getChannelStats, getChannelVideos };
