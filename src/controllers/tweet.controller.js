import mongoose,{isValidObjectId} from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";


const createTweet = asyncHandler(async (req, res) => {
  const { content, photo, video, postOwnerId } = req.body;

  try {
    if (!content || content.trim().length === 0) {
      throw new ApiError(400, "Tweet content is required");
    }

    if (photo && typeof photo !== "string") {
      throw new ApiError(400, "Invalid photo URL");
    }

    if (video && typeof video !== "string") {
      throw new ApiError(400, "Invalid video URL");
    }

    if (postOwnerId && !mongoose.Types.ObjectId.isValid(postOwnerId)) {
      throw new ApiError(400, "Invalid post owner ID");
    }

    const newTweet = new Tweet({
      content,
      photo: photo || null,
      video: video || null,
      owner: postOwnerId || req.user._id, 
    });

    const savedTweet = await newTweet.save();

    const populatedTweet = await Tweet.findById(savedTweet._id).populate({
      path: "owner",
      select: "_id username avatar", 
    });

    return res
      .status(201)
      .json(new ApiResponse(201, populatedTweet, "Tweet created successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, "Failed to create tweet", error.message));
  }
});

const getUserTweets = asyncHandler(async (req, res) => {
  // console.log("getUserTweets Controller called");
  const userId = req.params.userId;

  try {
    // console.log("Fetching tweets for user ID:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid user ID");
    }

    const user = await User.findById(userId, "_id username avatar");
    if (!user) {
      console.log("User not found for ID:", userId);
      return res
        .status(404)
        .json(new ApiResponse(404, [], "User not found"));
    }


    const tweets = await Tweet.find({ owner: userId })
      .populate({
        path: "owner",
        select: "_id username avatar",
      })
      .sort({ createdAt: -1 });

    if (!tweets || tweets.length === 0) {
      // console.log("No tweets found for user ID:", userId);
      return res
        .status(404)
        .json(new ApiResponse(404, [], "No tweets found for this user"));
    }

    // console.log("Tweets retrieved successfully for user ID:", userId);
    return res
      .status(200)
      .json(new ApiResponse(200, { user, tweets }, "User tweets retrieved successfully"));
  } catch (error) {
    // console.error("Error retrieving tweets for user ID:", userId, error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, "Failed to retrieve user tweets", error.message));
  }
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content, photo, video } = req.body;

  try {
    // console.log("Updating tweet with ID:", tweetId);

 
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
      throw new ApiError(400, "Invalid tweet ID");
    }

   
    const tweet = await Tweet.findById(tweetId).populate({
      path: "owner",
      select: "_id username avatar",
    });

    if (!tweet) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Tweet not found"));
    }

    if (req.user._id.toString() !== tweet.owner._id.toString()) {
      throw new ApiError(403, "You are not authorized to update this tweet");
    }

    if (content) tweet.content = content;
    if (photo) {
      if (typeof photo !== "string") {
        throw new ApiError(400, "Invalid photo URL");
      }
      tweet.photo = photo;
    }
    if (video) {
      if (typeof video !== "string") {
        throw new ApiError(400, "Invalid video URL");
      }
      tweet.video = video;
    }

    const updatedTweet = await tweet.save();

    // console.log("Tweet updated successfully:", updatedTweet);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            _id: updatedTweet._id,
            content: updatedTweet.content,
            photo: updatedTweet.photo,
            video: updatedTweet.video,
            createdAt: updatedTweet.createdAt,
            updatedAt: updatedTweet.updatedAt,
            owner: tweet.owner, 
          },
          "Tweet updated successfully"
        )
      );
  } catch (error) {
    // console.error("Error updating tweet:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, error.message));
  }
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  try {
    // console.log("Deleting tweet with ID:", tweetId);

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
      throw new ApiError(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.findById(tweetId).populate({
      path: "owner",
      select: "_id username avatar",
    });

    if (!tweet) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Tweet not found"));
    }

    if (req.user._id.toString() !== tweet.owner._id.toString()) {
      throw new ApiError(403, "You are not authorized to delete this tweet");
    }

    await tweet.deleteOne();

    // console.log("Tweet deleted successfully:", tweetId);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            _id: tweet._id,
            content: tweet.content,
            photo: tweet.photo,
            video: tweet.video,
            owner: tweet.owner, 
          },
          "Tweet deleted successfully"
        )
      );
  } catch (error) {
    // console.error("Error deleting tweet:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, error.message));
  }
});


export { createTweet, getUserTweets,updateTweet,deleteTweet };
