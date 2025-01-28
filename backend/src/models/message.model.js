import mongoose from "mongoose";

const messageSchema = mongoose.Schema({
    senderId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        requried: true
    },
    receiverId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        requried: true
    },
    text:{
        type: String,
    },
    image:{
        type: String,
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editHistory: [{
        text: String,
        editedAt: Date
    }],
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null
    },
    readBy: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    isDeleted: {
        type: Boolean,
        default: false
    },
}, {timestamps: true});

const Message = mongoose.model("Message", messageSchema);
export default Message;