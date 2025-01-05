import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Failed to generate access and refresh token");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // console.log("Register user controller called");
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  const { fullName, email, username, password } = req.body;
  // console.log("email", email);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "Please fill all the fields");
  }
  /*
    if(!fullName || !email || !username || !password){
        // res.status(400).json({
        //     success: false,
        //     message: "Please fill all the fields",
        // });
        //or
        throw new ApiError(400, "Please fill all the fields");
    }
 */

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    // console.log("User with email or username already exists");
    throw new ApiError(409, "User with email or username already exists");
  }

  //check for images
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  // let coverImageLocalPath;
  // if (
  //   req.files &&
  //   Array.isArray(req.files.coverImage) &&
  //   req.files.coverImage.length > 0
  // ) {
  //   coverImageLocalPath = req.files.coverImage[0].path;
  // }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Please upload avatar is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : { url: "" };

  if (!avatar) {
    throw new ApiError(400, "Failed to upload avatar");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  // console.log("User created:", user);
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Failed to create user ");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // console.log("Login user controller called");
  // get user details from frontend
  // validation - not empty
  // check if user exists: username, email
  // check for password
  // create access token and refresh token
  // send cookies
  // remove password and refresh token field from response
  // return res

  const { email, username, password } = req.body;
  // console.log("Received request data:", { email, username });

  if (!username && !email) {
    // console.error("Username or email is required but missing!");
    throw new ApiError(400, "Please fill all the fields");
  }

  // if (!password) {
  //   console.error("Password is missing!");
  //   throw new ApiError(400, "Password is required.");
  // }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  // console.log("User found:", user);

  if (!user) {
    // console.error("User not found for the given username/email.");
    throw new ApiError(404, "User not found");
  }

  const isPasswordMatched = await user.isPasswordCorrect(password);
  // console.log("Is password matched:", isPasswordMatched);
  if (!isPasswordMatched) {
    // console.error("Invalid credentials: Password is incorrect.");
    throw new ApiError(401, "Invalid credentials");
  }

  // const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
  //   user._id
  // );
  // console.log("Generated tokens:", { accessToken, refreshToken });

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );
    // console.log("Generated tokens:", { accessToken, refreshToken });


  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // console.log("Logged-in user details:", loggedInUser);
  // console.log(res.getHeaders());

  const options = {
    httpOnly: true,
    secure: true,
  };
  // console.log("Sending response with tokens and user details.");

  // return res.status(200).send("Login successful")

  return res

    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, loggedInUser, "Login successful"));
    // .json("login successful")
});

//logout user

const logoutUser = asyncHandler(async (req, res) => {
  // console.log("Logout user controller called");
  // console.log("User in request:", req.user);

  const userId = req.user?._id;
  if (!userId) {
    // console.error("User ID not found in req.user");
    throw new ApiError(400, "Bad Request: User ID missing");
  }

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, //remove refreshToken field
      },
    },
    {
      new: true,
      // runValidators: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
    // sameSite: "none",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

//refresh access token

const resfreshAccessToken = asyncHandler(async (req, res) => {
  // console.log("Refresh access token controller called");

  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
      // sameSite: "none",
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  // console.log("Change password controller called");

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Please provide current password and new password");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordMatched = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordMatched) {
    throw new ApiError(401, "Invalid current password");
  }

  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  // console.log("Get current user controller called");
  // console.log("User in request:", req.user);

  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  // console.log("Update accout details controller called");
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  // console.log("Upadte user avatar controller called");

  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }
  // Retrieve the user's current data (before updating)
  const existingUser = await User.findById(req.user._id);
  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  const oldAvatarUrl = existingUser.avatar;

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  if (oldAvatarUrl && oldAvatarUrl !== avatar.url) {
    // console.log("Deleting old avatar image from cloudinary...");
    await deleteFromCloudinary(oldAvatarUrl);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Avatar Image updated successfully")
    );
});

const upadateCoverImage = asyncHandler(async (req, res) => {
  // console.log("Update cover image controller called");

  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage) {
    throw new ApiError(400, "Error while uploading cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  // console.log("Get user channel profile controller called");

  try {
    const { username } = req.params;
    console.log("Username:", username);
    if (!username?.trim()) {
      throw new ApiError(400, "Username is required");
    }
  
    const channel = await User.aggregate([
      {
        $match: {
          username: username?.toLowerCase(),
        },
      },
      {
        //to get the count of subscribers
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        //to get the count of subscribers
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "susbcribedTo",
        },
      },
      // {
      //         $addFields: {
      //             subscribersCount: {
      //                 $size: "$subscribers"
      //             },
      //             channelsSubscribedToCount: {
      //                 $size: "$subscribedTo"
      //             },
      //             isSubscribed: {
      //                 $cond: {
      //                     if: {$in: [req.user?._id, "$subscribers.subscriber"]},
      //                     then: true,
      //                     else: false
      //                 }
      //             }
      //         }
      //     },
      {
        $addFields: {
          subscribers: { $ifNull: ["$subscribers", []] }, // Ensure subscribers is an array
          subscribedTo: { $ifNull: ["$subscribedTo", []] }, // Ensure subscribedTo is an array
          subscriberCount: { $size: { $ifNull: ["$subscribers", []] } }, // Use $ifNull here as well
          subscribedToCount: { $size: { $ifNull: ["$subscribedTo", []] } },
          isSubscribed: {
            $cond: {
              if: {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: { $ifNull: ["$subscribers", []] }, // Ensure input is an array
                        as: "subscriber",
                        cond: { $eq: ["$$subscriber.subscriber", req.user?._id] },
                      },
                    },
                  },
                  0,
                ],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          username: 1,
          fullName: 1,
          avatar: 1,
          coverImage: 1,
          subscriberCount: 1,
          subscribedToCount: 1,
          isSubscribed: 1,
          email: 1,
        },
      },
    ]);
    // console.log("channel:", channel);
    if (!channel?.length) {
      console.error("Channel not found");
      throw new ApiError(404, "Channel not found");
    }
    // console.log("Returning response for channel:", channel[0]);
    return res
      .status(200)
      .json(new ApiResponse(200, channel[0], "Channel fetched successfully"));
  } catch (error) {
    console.error("Error in getUserChannelProfile:", error.message);
    throw new ApiError(500, error.message || "Internal Server Error");
  }
});

const getWatchHistory = asyncHandler(async (req, res) => {
  // console.log("Get watch history controller called");
  try {
    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      fullName: 1,
                      username: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                owner: {
                  $first: "$owner",
                },
              },
            },
          ],
        },
      },
      {
        $addFields: {
          watchHistory: { $ifNull: ["$watchHistory", []] }, // Ensures watchHistory is always an array
        },
      },
    ]);
  
    if (!user || user.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "User not found or no watch history"));
    }
  
    // console.log("User watch history:", user[0].watchHistory);
  
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          user[0].watchHistory,
          "Watch history fetched successfully"
        )
      );
  } catch (error) {
    // console.error("Error fetching watch history:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to fetch watch history"));
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  resfreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  upadateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
