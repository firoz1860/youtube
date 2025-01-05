import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import path from "path";


const publishAVideo = asyncHandler(async (req, res) => {
  // console.log("Request body:", req.body);
  // console.log("Request files:", req.files);

  const { title, description } = req.body;

  // console.log("Title:", title);
  // console.log("Description:", description);

  try {
    // Validate title and description
    if (!title || !description) {
      // console.error("Title or description is missing.");
      throw new ApiError(
        400,
        "Bad Request",
        "Title and description are required",
        false,
        null
      );
    }

    // Validate file presence
    if (!req.files || !req.files.videoFile || !req.files.thumbnail) {
      // console.error("Files missing in the request.");
      throw new ApiError(
        400,
        "Bad Request",
        "Video file and thumbnail are required",
        false,
        null
      );
    }

    const videoFilePath = path.normalize(req.files.videoFile[0].path);
    const thumbnailFilePath = path.normalize(req.files.thumbnail[0].path);

    // console.log("Normalized video file path:", videoFilePath);
    // console.log("Normalized thumbnail file path:", thumbnailFilePath);

    // Check if files exist
    if (!fs.existsSync(videoFilePath) || !fs.existsSync(thumbnailFilePath)) {
      // console.error("One or more files do not exist.");
      throw new Error("One or more files do not exist.");
    }

    // console.log("Uploading video to Cloudinary...");
    const videoUpload = await uploadOnCloudinary(videoFilePath, {
      resource_type: "video",
      folder: "videos",
    });
    // console.log("Video upload response:", videoUpload);

    if (!videoUpload || !videoUpload.secure_url) {
      // console.error("Video upload failed.");
      throw new Error("Video upload failed.");
    }

    // console.log("Uploading thumbnail to Cloudinary...");
    const thumbnailUpload = await uploadOnCloudinary(thumbnailFilePath, {
      resource_type: "image",
      folder: "thumbnails",
    });
    // console.log("Thumbnail upload response:", thumbnailUpload);

    if (!thumbnailUpload || !thumbnailUpload.secure_url) {
      // console.error("Thumbnail upload failed.");
      throw new Error("Thumbnail upload failed.");
    }

    // Clean up temporary files
    [videoFilePath, thumbnailFilePath].forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        // console.log("Deleting file:", filePath);
        fs.unlinkSync(filePath);
      } else {
        // console.warn("File not found for deletion:", filePath);
      }
    });

    // console.log("Creating new video document in the database...");
    const newVideo = await Video.create({
      video: videoUpload.secure_url,
      thumbnail: thumbnailUpload.secure_url,
      title,
      description,
      duration: Math.ceil(videoUpload.duration || 0),
      owner: req.user._id,
    });
    // console.log("New video created:", newVideo);

    return res.status(201).json(
      new ApiResponse(
        201,
        { data: newVideo },
        "Video created successfully",
        true
      )
    );
  } catch (error) {
    // console.error("Error publishing video:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Failed to publish video", error.message, false));
  }
});

const getAllVideos = asyncHandler(async (req, res) => {
  //get the page and limit query parameters from the request query
  //Find all videos
  //Paginate the videos
  //Send the paginated videos as a response
  // console.log("getAllvideos controller called");

  const {
    page = 1,
    limit = 10,
    query,
    sortBy = createdAt,
    sortType = "desc",
    userId,
  } = req.query;

  try {
    const pipeline = [
      {
        $match: {
          ...(query && { title: { $regex: query, $options: "i" } }),
          ...(userId && { owner: mongoose.Types.ObjectId(userId) }),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
        },
      },
      {
        $unwind: "$ower",
      },
      {
        $sort: {
          [sortBy]: sortType === "asc" ? 1 : -1,
        },
      },
      {
        $skip: (parseInt(page) - 1) * parseInt(limit),
      },
      {
        $limit: parseInt(limit),
      },
      {
        $project: {
          video: 1,
          thumbnail: 1,
          title: 1,
          description: 1,
          duration: 1,
          views: 1,
          isPublished: 1,
          createdAt: 1,
          owner: {
            fullName: 1,
            username: 1,
            avatar: 1,
          },
        },
      },
    ];

    const videos = await Video.aggregate(pipeline);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { data: videos },
          "Videos fetched successfully",
          true
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", error.message, false));
  }
});

const getVideoById = asyncHandler(async (req, res) => {
  //TODO: get video by id
  //find the video by id
  //populate the owner field
  //send the video as a response

  // console.log("getVideoById controller called");
  
  const { videoId } = req.params;
  // console.log("videoId", videoId);
  try {
    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Bad Request", "Invalid video id", false, null);
    }
    const video = await Video.findById(videoId).populate("owner", "fullName username avatar");
    // console.log("video", video);

    if (!video) {
      throw new ApiError(404, "Not Found", "Video not found", false, null);
    }
    return res
      .status(200)
      .json(new ApiResponse(200, { data: video }, "Video fetched successfully", true));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "An error occurred while fetching the video",error.message, false));
  }

})

const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  //find the video by id
  //check if the video exists  
  //update the video details and save the video
  //send the updated video as a response 
  const { videoId } = req.params;
  const { title, description } = req.body;

  try {
    const video = await Video.findById(videoId);
    if (!video) {
      throw new ApiError(404, "Not Found", "Video not found", false, null);
    }
  
    // if (video.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    //   throw new ApiError(403, "Forbidden", "You are not allowed to update this video", false, null);
    // }
  
    if(title) video.title = title;
    if(description) video.description = description;
  
    if(req.file){
      const thumbnailUpload = await uploadOnCloudinary(req.file.path);
      
      if(thumbnailUpload){
        if(video.thumbnailUrl){
          await deleteFromCloudinary(video.thumbnailUrl);
        }
  
        video.thumbnailUrl = thumbnailUpload.secure_url;
      }
    }
    const updatedVideo = await video.save();
  
    return res
      .status(200)
      .json(new ApiResponse(200, { data: updatedVideo }, "Video updated successfully", true));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "An error occurred while updating the video",error.message, false));
    
  }

})

const deleteVideo = asyncHandler(async (req, res) => {
  console.log("deleteVideo controller called");
  //TODO: delete video
  //find the video by id 
  //check if the video exists
  //delete the video from the database
  //send a success response
  const { videoId } = req.params

 try {
   const video = await Video.findById(videoId);
   console.log("video", video);
   if (!video) {
     throw new ApiError(404, "Not Found", "Video not found", false, null);
   }
   if(video.cloudinaryVideoUrl){
     await deleteFromCloudinary(video.cloudinaryVideoUrl);
   }
 
   if(video.thumbnailUrl){
     await deleteFromCloudinary(video.thumbnailUrl);
   }
 
   await Video.findByIdAndDelete(videoId);
 
   return res
     .status(200)
     .json(new ApiResponse(200, null, "Video deleted successfully", true));
 } catch (error) {
  return res
  .status(500)
  .json(new ApiError(500, "An error occurred while deleting the video",error.message, false));
 }
})

const togglePublishStatus = asyncHandler(async (req, res) => {
  console.log("togglePublishStatus controller called");
  //TODO: toggle publish status
  //find the video by id
  //check if the video exists
  //toggle the publish status
  //save the video
  //send the updated video as a response


  const { videoId } = req.params

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Not Found", "Video not found", false, null);
  }

  video.isPublished = !video.isPublished;
  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { data: video }, `Video publish status toggled to ${video.isPublished ? "published" : "unpublished"}`, true));
})

export { getAllVideos, publishAVideo ,getVideoById,updateVideo,deleteVideo,togglePublishStatus};
