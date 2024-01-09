import { Schema, model } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const videoSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    videoFile: {
      type: String,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    // likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    // dislikes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    // comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    // tags: [{ type: String, trim: true }],
    // category: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Category",
    //   required: true,
    // },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // channel: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Channel",
    //   required: true,
    // },
  },
  { timestamps: true }
);
videoSchema.plugin(mongooseAggregatePaginate);

const Video = model("Video", videoSchema);
