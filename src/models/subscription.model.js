import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, // subscriber one who is subscribing
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId, // channel one who is being subscribed
        ref: "User"
    },
    // avatar: {
    //     type: String,
    //     default: ""
    // }
}, { timestamps: true });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);