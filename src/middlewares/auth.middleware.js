import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    console.log("Token received in verifyJWT:", token);

    if (!token) {
      console.error("Token missing in request");
      throw new ApiError(401, "Unauthorized");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log("Decoded Token:", decodedToken);

    // let decodedToken;
    // try {
    //   decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    //   console.log("ACCESS_TOKEN_SECRET:", process.env.ACCESS_TOKEN_SECRET);
    //   console.log("Decoded Token:", decodedToken);
    // } catch (error) {
    //   console.error("Error decoding token:", error.message);
    //   throw new ApiError(401, "Invalid or expired token");
    // }

    // const user = await User.findById(decodedToken?._id).select(
    //   "-password -refreshToken"
    // );

    // const userId = decodedToken?._id;
    // console.log("User ID from decoded token:", userId);

    // const user = await User.findById(userId).select("-password -refreshToken");
    // console.log("User from DB:", user);
    //TODO:decodedToken?._id
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    console.log("User ID from decoded token:", decodedToken?._id);
    console.log("User from DB:", user);

    if (!user) {
      console.error("User not found in DB for ID:", decodedToken?._id);
      // console.log("User not found in DB for ID:", decodedToken._id);
      throw new ApiError(401, "Invalid Access token");
    }
    console.log("User from DB:", user);

    req.user = user;
    console.log("req.user:", req.user);
    next();
    console.log("verifyJWT middleware finished");
  } catch (error) {
    throw new ApiError(401, error?.message || "Unauthorized");
  }
});
