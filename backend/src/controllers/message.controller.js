import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async(req, res)=>{
    try {
        const loggedUserId = req.user._id;
        const filteredUsers = await User.find({_id: {$ne: loggedUserId}}).select("-password");

        res.status(200).json(filteredUsers);

    } catch (error) {
        console.log("Error in getUsersForSidebar controller", error.message);
        res.status(500).json({success: false, message: "Internal Server Error"});
    }
}

export const getMessages = async(req, res)=>{
    try {
        const {id:userToChatId} = req.params;
        const myId = req.user._id;
        const messages = await Message.find({
            $or:[
                {senderId:myId, receiverId:userToChatId},
                {senderId:userToChatId, receiverId:myId}
            ]
        }).populate('replyTo');

        res.status(200).json(messages);

    } catch (error) {
        console.log("Error in getMessages controller", error.message);
        res.status(500).json({success: false, message: "Internal Server Error"});
    }
}

export const sendMessage = async(req, res)=>{
    try {
        const {text, image} = req.body;
        const {id: receiverId} = req.params;
        const senderId = req.user._id;
        let imageUrl;
        if(image){
            //upload base64 image to cloudinary
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        })

        await newMessage.save();

        //real time functionality => socket.io
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage);
    }

        res.status(201).json(newMessage);

    } catch (error) {
        console.log("Error in sendMessage controller", error.message);
        res.status(500).json({success: false, message: "Internal Server Error"});
    }
}


export const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Unauthorized to edit this message" });
        }

        // Store the original message in edit history
        message.editHistory.push({
            text: message.text,
            editedAt: new Date()
        });

        message.text = text;
        message.isEdited = true;
        await message.save();

        // Emit socket event for real-time update
        const receiverSocketId = getReceiverSocketId(message.receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("messageEdited", message);
        }

        res.status(200).json(message);
    } catch (error) {
        console.log("Error in editMessage controller", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Unauthorized to delete this message" });
        }

        message.isDeleted = true;
        message.text = "This message has been deleted";
        message.image = null;
        await message.save();

        // Emit socket event for real-time update
        const receiverSocketId = getReceiverSocketId(message.receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("messageDeleted", messageId);
        }

        res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
        console.log("Error in deleteMessage controller", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const replyToMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { text, image } = req.body;
        const senderId = req.user._id;

        const originalMessage = await Message.findById(messageId);
        if (!originalMessage) {
            return res.status(404).json({ message: "Original message not found" });
        }

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId: originalMessage.senderId,
            text,
            image: imageUrl,
            replyTo: messageId
        });

        await newMessage.save();

        // Emit socket event for real-time update
        const receiverSocketId = getReceiverSocketId(originalMessage.senderId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error in replyToMessage controller", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const markMessageAsRead = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        // Check if user is the intended receiver
        if (message.receiverId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Unauthorized to mark this message as read" });
        }

        // Check if user hasn't already marked the message as read
        const alreadyRead = message.readBy.some(read => read.userId.toString() === userId.toString());
        if (!alreadyRead) {
            message.readBy.push({ userId, readAt: new Date() });
            await message.save();

            // Emit socket event for real-time update
            const senderSocketId = getReceiverSocketId(message.senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("messageRead", {
                    messageId: message._id,
                    readBy: message.readBy
                });
            }
        }

        res.status(200).json(message);
    } catch (error) {
        console.log("Error in markMessageAsRead controller", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};