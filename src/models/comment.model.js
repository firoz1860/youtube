import mongoose, { Schema } from "mongoose";
import mongooseaggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: true, // Ensure comments are always associated with a video
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true, // Ensure comments always have an owner
    },
    likesCount: {
      type: Number,
      default: 0, // Default to 0 for new comments
    },
    repliesCount: {
      type: Number,
      default: 0, // Default to 0 if no replies
    },
    isDeleted: {
      type: Boolean,
      default: false, // Support soft deletion of comments
    },
  },
  { timestamps: true }
);

// Add pagination plugin
commentSchema.plugin(mongooseaggregatePaginate);

export const Comment = mongoose.model("Comment", commentSchema);