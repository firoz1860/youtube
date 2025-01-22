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
  const {channelId} = req.params
  if(!channelId){
      throw new ApiError(401,"Channel Id is Missing");
  }
  
  const subscriberList = await Subscription.aggregate(
      [
          {
            '$match': {
              'channel': new mongoose.Types.ObjectId(String(channelId))
            }
          }, {
            '$lookup': {
              'from': 'users', 
              'localField': 'subscriber', 
              'foreignField': '_id', 
              'as': 'SubscriberList', 
              'pipeline': [
                {
                  '$project': {
                    'fullName': 1, 
                    'username': 1, 
                    'avatar': 1
                  }
                }
              ]
            }
          }, {
            '$addFields': {
              'subscriber': {
                '$first': '$SubscriberList'
              }
            }
          }, {
            '$project': {
              'SubscriberList': 0
            }
          }, {
            '$group': {
              '_id': '$channel', 
              'subscriber': {
                '$push': '$subscriber'
              }
            }
          }, {
            '$lookup': {
              'from': 'users', 
              'localField': '_id', 
              'foreignField': '_id', 
              'as': 'ChannelDetails', 
              'pipeline': [
                {
                  '$project': {
                    'fullName': 1, 
                    'username': 1, 
                    'avatar': 1
                  }
                }
              ]
            }
          }, {
            '$addFields': {
              'ChannelDetails': {
                '$first': '$ChannelDetails'
              }
            }
          }
        ]
  );

  if(!subscriberList.length){
      throw new ApiError(401,"No Subscribers Found")
  }
  return res.status(200).json(new ApiResponse(200,subscriberList[0]));


})

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params
  if(!subscriberId){
      throw new ApiError(401,"Subscriber Id is Missing")
  }
  const channelList = await Subscription.aggregate(
      [
          {
            '$match': {
              'subscriber': new mongoose.Types.ObjectId(String(subscriberId))
            }
          }, {
            '$lookup': {
              'from': 'users', 
              'localField': 'channel', 
              'foreignField': '_id', 
              'as': 'ChannelList', 
              'pipeline': [
                {
                  '$project': {
                    'fullName': 1, 
                    'username': 1, 
                    'avatar': 1
                  }
                }
              ]
            }
          }, {
            '$addFields': {
              'channels': {
                '$first': '$ChannelList'
              }
            }
          }, {
            '$project': {
              'ChannelList': 0
            }
          }, {
            '$group': {
              '_id': '$subscriber', 
              'channels': {
                '$push': '$channels'
              }
            }
          }, {
            '$lookup': {
              'from': 'users', 
              'localField': '_id', 
              'foreignField': '_id', 
              'as': 'SubscriberDetails', 
              'pipeline': [
                {
                  '$project': {
                    'fullName': 1, 
                    'username': 1, 
                    'avatar': 1
                  }
                }
              ]
            }
          }, {
            '$addFields': {
              'SubscriberDetails': {
                '$first': '$SubscriberDetails'
              }
            }
          }
        ]
  );

  if(!channelList.length){
      throw new ApiError(401,"No Channels Found")
  }
  return res.status(200).json(new ApiResponse(200,channelList[0]));

})

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
