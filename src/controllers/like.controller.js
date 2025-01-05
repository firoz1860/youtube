import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js"; 
import { Tweet } from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  try {
    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid Video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    const userId = req.user._id;
    let message = "";

    const existingLike = await Like.findOne({ video: videoId, likedBy: userId });

    if (existingLike) {
      // Remove like from video
      await Like.deleteOne({ _id: existingLike._id });
      video.likeCount = Math.max(0, video.likeCount - 1);
      message = "You have unliked the video";
    } else {
      // Add like to video
      const newLike = new Like({ video: videoId, likedBy: userId });
      await newLike.save();
      video.likeCount += 1;
      message = "You have liked the video";
    }

    await video.save();

    return res
      .status(200)
      .json(new ApiResponse(200, { likeCount: video.likeCount }, message, true));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, "Failed to toggle video like", error.message, false));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  try {
    if (!isValidObjectId(commentId)) {
      throw new ApiError(400, "Invalid Comment ID");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }

    const userId = req.user._id;
    let message = "";

    const existingLike = await Like.findOne({ comment: commentId, likedBy: userId });

    if (existingLike) {
      // Remove like from comment
      await Like.deleteOne({ _id: existingLike._id });
      comment.likeCount = Math.max(0, comment.likeCount - 1);
      message = "You have unliked the comment";
    } else {
      // Add like to comment
      const newLike = new Like({ comment: commentId, likedBy: userId });
      await newLike.save();
      comment.likeCount += 1;
      message = "You have liked the comment";
    }

    await comment.save();

    return res
      .status(200)
      .json(new ApiResponse(200, { likeCount: comment.likeCount }, message, true));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, "Failed to toggle comment like", error.message, false));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  try {
    if (!isValidObjectId(tweetId)) {
      throw new ApiError(400, "Invalid Tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
      throw new ApiError(404, "Tweet not found");
    }

    const userId = req.user._id;
    let message = "";

    const existingLike = await Like.findOne({ tweet: tweetId, likedBy: userId });

    if (existingLike) {
      // Remove like from tweet
      await Like.deleteOne({ _id: existingLike._id });
      tweet.likeCount = Math.max(0, tweet.likeCount - 1);
      message = "You have unliked the tweet";
    } else {
      // Add like to tweet
      const newLike = new Like({ tweet: tweetId, likedBy: userId });
      await newLike.save();
      tweet.likeCount += 1;
      message = "You have liked the tweet";
    }

    await tweet.save();

    return res
      .status(200)
      .json(new ApiResponse(200, { likeCount: tweet.likeCount }, message, true));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, "Failed to toggle tweet like", error.message, false));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  try {
    // Query videos where the user's ID exists in the likes array
    const likedVideos = await Video.find({ likes: userId });

    return res
      .status(200)
      .json(new ApiResponse(200, likedVideos, "Liked videos retrieved successfully", true));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, "Failed to retrieve liked videos", error.message, false));
  }
});


export {
  toggleVideoLike,
  toggleCommentLike,
  toggleTweetLike,
  getLikedVideos
};