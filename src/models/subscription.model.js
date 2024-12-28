import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subccriber:{
        type: Schema.Types.ObjectId,//subscriber one who is subscribing
        ref: "User"
    },
    channel:{
        type: Schema.Types.ObjectId,//channel one who is being subscribed
        ref: "User"
    }
},{timestamps: true});

export default mongoose.model("Subscription", subscriptionSchema);