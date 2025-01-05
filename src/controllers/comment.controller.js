import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js"; 
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addComment = asyncHandler(async (req, res) => {
  // console.log("addComment controller called");
  // Get the videoId from the request parameters
  // Get the content from the request body
  // Get the user id from the request user object
  // Create a new comment
  // Send the new comment as a response

  try {
    const { videoId } = req.params;
    const { content } = req.body;

    // console.log("Received videoId:", videoId);
    // console.log("Received content:", content);

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      // console.log("Invalid video id");
      throw new ApiError(400, "Invalid video id");
    }

    if (!content || content.trim().length === "") {
      // console.log("Comment content is required");
      throw new ApiError(400, "Comment content is required");
    }

    const video = await Video.findById(videoId);
    // console.log("Video found:", video);

    if (!video) {
      // console.log("Video not found");
      throw new ApiError(404, "Video not found");
    }

    const newComment = new Comment({
      content,
      video: videoId,
      owner: req.user._id, // Set the owner field
    });

    // console.log("Creating new comment:", newComment);

    const savedComment = await newComment.save();
    // console.log("Comment saved:", savedComment);

    video.commentsCount += 1;
    await video.save();
    // console.log("Updated video comments count:", video.commentsCount);

    return res
      .status(201)
      .json(new ApiResponse(201, { comment: savedComment }, "Comment added successfully"));
  } catch (error) {
    // console.error("Error occurred:", error.message);
    return res.status(500).json(new ApiResponse(500, "Failed to add comment", error.message));
  }
});


const getVideoComments = asyncHandler(async (req, res) => {
  // console.log("getVideoComments controller called")
  // Get the videoId from the request parameters
  // Get the page and limit query parameters from the request query
  // Find all comments that belong to the video with the videoId
  // Paginate the comments
  // Send the paginated comments as a response
  try {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // console.log("Received videoId:", videoId);
    // console.log("Page:", page);
    // console.log("Limit:", limit);
  
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      // console.log("Invalid video id");
      throw new ApiError(400, "Invalid video id");
    }
  
    const comments = await Comment.aggregate([
      {$match:{video: new mongoose.Types.ObjectId(videoId)}},
      {$sort:{createdAt:-1}},
      {
        $facet:{
          metadata:[{$count:"total"}],
          data:[
            {$skip:(page-1)*limit},
            {$limit:parseInt(limit)},
            {
              $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"user",
              }
            },
            {
              $addFields:{
                user:{$arrayElemAt:["$user",0]},
              }
            },
            {
              $project:{
                content:1,
                createdAt:1,
                user:{
                  username:1,
                  avatar:1,
                }
              }
            }
          ]
        }
      }
    ]);
  
    const total = comments[0].metadata[0]?.total || 0;
    // console.log("Total comments:", total);
    
    return res
    .status(200)
    .json(new ApiResponse(200, {comments:comments[0].data,total,page,
    pages:Math.ceil(total/limit)
    }));
  } catch (error) {
    // console.error("Error occurred:", error.message);
    res.status(500)
    .json(new ApiResponse(500, "Failed to fetch comments",error.message));
  }
});



const updateComment = asyncHandler(async (req, res) => {
  // console.log("updateComment controller called");
  // Get the commentId from the request parameters
  // Get the content from the request body
  // Find the comment with the commentId
  // Check if the comment exists
  // Check if the user is the owner of the comment
  // Update the comment content
  // Send the updated comment as a response

  try {
    const { commentId } = req.params;
    const { content } = req.body;

    // console.log("Received commentId:", commentId);
    // console.log("Received content:", content);

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      // console.log("Invalid comment id");
      throw new ApiError(400, "Invalid comment id");
    }

    if (!content || content.trim().length === "") {
      // console.log("Comment content is required");
      throw new ApiError(400, "Comment content is required");
    }

    const comment = await Comment.findById(commentId);
    // console.log("Comment found:", comment);

    if (!comment) {
      // console.log("Comment not found");
      throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
      // console.log("User not allowed to update this comment");
      throw new ApiError(403, "You are not allowed to update this comment");
    }

    comment.content = content;

    const updatedComment = await comment.save();
    // console.log("Comment updated:", updatedComment);

    return res
      .status(200)
      .json(new ApiResponse(200, { comment: updatedComment }, "Comment updated successfully"));
  } catch (error) {
    // console.error("Error occurred:", error.message);
    return res.status(500).json(new ApiResponse(500, "Failed to update comment", error.message));
  }
});

const deleteComment = asyncHandler(async (req, res) => {
  // console.log("deleteComment controller called");
  // Get the commentId from the request parameters
  // Find the comment with the commentId
  // Check if the comment exists
  // Check if the user is the owner of the comment
  // Delete the comment
  // Send a success response

  try {
    const { commentId } = req.params;

    // console.log("Received commentId:", commentId);

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      // console.log("Invalid comment id");
      throw new ApiError(400, "Invalid comment id");
    }

    const comment = await Comment.findById(commentId);
    // console.log("Comment found:", comment);

    if (!comment) {
      // console.log("Comment not found");
      throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
      // console.log("User not allowed to delete this comment");
      throw new ApiError(403, "You are not allowed to delete this comment");
    }

    await comment.deleteOne();
    // console.log("Comment deleted");

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Comment deleted successfully"));
  } catch (error) {
    // console.error("Error occurred:", error.message);
    return res.status(500).json(new ApiResponse(500, "Failed to delete comment", error.message));
  }
});

export { getVideoComments ,addComment, updateComment, deleteComment };
