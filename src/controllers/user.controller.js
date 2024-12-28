import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary,deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Failed to generate access and refresh token");
    
  }
}

const registerUser = asyncHandler(async (req, res) => {
  console.log("Register user controller called");
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
    console.log("User with email or username already exists");
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
  console.log("Login user controller called");
  // get user details from frontend
  // validation - not empty
  // check if user exists: username, email
  // check for password
  // create access token and refresh token
  // send cookies
  // remove password and refresh token field from response
  // return res

  const {email, username, password } = req.body;
  console.log(email);
  
  if (!username && !password) {
    throw new ApiError(400, "Please fill all the fields");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordMatched = await user.isPasswordCorrect(password);
  if (!isPasswordMatched) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
    // sameSite: "none",
  }
  return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    )
});

//logout user

const logoutUser = asyncHandler(async (req, res) => {
  console.log("Logout user controller called");
  console.log("User in request:", req.user);
  
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,//remove refreshToken field
      }
    },
    {
      new: true,
      // runValidators: true,
    }
  )
  const options = {
    httpOnly: true,
    secure: true,
    // sameSite: "none",
  }
  
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
})

//refresh access token

const resfreshAccessToken = asyncHandler(async (req, res) => {
  console.log("Refresh access token controller called");

  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }
  
  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
  
    if(user?.refreshToken !== incomingRefreshToken){
      throw new ApiError(401, "Refresh token is expired or used");
    }
  
    const options = {
      httpOnly: true,
      secure: true,
      // sameSite: "none",
    }
  
    const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);
  
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken}, "Access token refreshed successfully"));
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  console.log("Change password controller called");

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
})


const getCurrentUser = asyncHandler(async (req, res) => {
  console.log("Get current user controller called");
  // console.log("User in request:", req.user);
  
  return res
  .status(200)
  .json(new ApiResponse(200, req.user, "User fetched successfully"));
})

const updateAccountDetails = asyncHandler(async (req,res)=>{
  console.log("Update accout details controller called");
  const {fullName, email} = req.body;
  if(!fullName || !email){
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        fullName:fullName,
        email:email,
      }
    },
    {new : true}
  ).select("-password");

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Account details updated successfully"));
})


const updateUserAvatar = asyncHandler(async (req, res)=>{
  console.log("Upadte user avatar controller called");

  const avatarLocalPath = req.file?.path;
  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if(!avatar){
    throw new ApiError(400, "Error while uploading avatar");
  }
// Retrieve the user's current data (before updating)
  const existingUser = await User.findById(req.user._id);
  if(!existingUser){
    throw new ApiError(404, "User not found");
  }

  const oldAvatarUrl = existingUser.avatar;

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        avatar: avatar.url,
      }
    },
    {new:true}
  ).select("-password");

  if(oldAvatarUrl && oldAvatarUrl !== avatar.url){
    console.log("Deleting old avatar image from cloudinary...");
    await deleteFromCloudinary(oldAvatarUrl);
  }

  return res
  .status(200)
  .json(new ApiResponse(200, updatedUser, "Avatar Image updated successfully"));
})

const upadateCoverImage = asyncHandler(async(req,res)=>{
  console.log("Update cover image controller called");

  const coverImageLocalPath = req.file?.path;
  if(!coverImageLocalPath){
    throw new ApiError(400, "Cover image file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if(!coverImage){
    throw new ApiError(400, "Error while uploading cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        coverImage: coverImage.url,
      }
    },
    {new:true}
  ).select("-password");

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Cover Image updated successfully"));
})





export { registerUser, loginUser, logoutUser, resfreshAccessToken,changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, upadateCoverImage };
