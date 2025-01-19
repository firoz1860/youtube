import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req?.user?._id;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(404, "Invalid Channel Id");
  }

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User Id");
  }

  const channelDetails = await User.findById(channelId);
  if (!channelDetails) {
    throw new ApiError(404, "Channel Not Found");
  }

  const isSubscribed = await Subscription.findOne({
    subscriber: userId,
    channel: channelId,
  });

  let message;

  if (isSubscribed) {
    await Subscription.deleteOne({
      subscriber: userId,
      channel: channelId,
    });
    channelDetails.subscriberCount = Math.max(
      0,
      channelDetails.subscriberCount - 1
    );
    channelDetails.subscribers.pull(userId);
    message = "Unsubscribed from channel successfully.";
  } else {
    const subscriber = await Subscription.create({
      subscriber: userId,
      channel: channelId,
    });
    if (!subscriber) {
      throw new ApiError(401, "Could not add user to channel");
    }
    channelDetails.subscriberCount += 1;
    channelDetails.subscribers.push(userId);
    message = "Subscribed to channel successfully.";
  }

  await channelDetails.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscription: {
          subscriber: userId,
          channel: channelId,
        },
        subscriberCount: channelDetails.subscriberCount,
      },
      message
    )
  );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  try {
    if (!isValidObjectId(channelId)) {
      throw new ApiError(400, "Invalid channel ID");
    }

    const channel = await User.findById(channelId);

    if (!channel) {
      throw new ApiError(404, "channel not found");
    }

    const subscribers = await Subscription.find({ channel: channelId })
      .populate("subscriber", "username avatar")
      .sort({ createdAt: -1 });

    if (!subscribers || subscribers.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(404, [], "No subscribers found for this channel")
        );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscribers,
          "Channel subscribers retrieved successfully"
        )
      );
  } catch (error) {
    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    return res
      .status(statusCode)
      .json(
        new ApiResponse(
          statusCode,
          "Failed to retrieve subscribers",
          error.message
        )
      );
  }
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  try {
    if (!isValidObjectId(subscriberId)) {
      throw new ApiError(404, "Invalid channel ID");
    }

    const subscriber = await User.findById(subscriberId);
    if (!subscriber) {
      throw new ApiError(404, "Subscriber not found");
    }

    const subscriptions = await Subscription.find({ subscriber: subscriberId })
      .populate("channel", "username avatar")
      .sort({ createdAt: -1 }); // Optional: Sort by most recent subscriptions

    if (!subscriptions || subscriptions.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, [], "No subscriptions found for this user"));
    }

    const subscribedChannels = await Subscription.map((sub) => ({
      _id: sub.channel._id,
      username: sub.channel.username,
      avatar: sub.channel.avatar,
    }));

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscribedChannels,
          "Subscribed channels retrieved successfully"
        )
      );
  } catch (error) {
    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    return res
      .status(statusCode)
      .json(
        new ApiResponse(
          statusCode,
          "Failed to retrieve subscriptions",
          error.message
        )
      );
  }
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
