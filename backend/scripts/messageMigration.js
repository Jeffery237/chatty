import mongoose from "mongoose";
import dotenv from "dotenv";
import Message from "../src/models/message.model.js";

// Load environment variables
dotenv.config();

const migration = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Perform the migration
        const result = await Message.updateMany(
            {}, 
            { 
                $set: {
                    isEdited: false,
                    editHistory: [],
                    replyTo: null,
                    readBy: [],
                    isDeleted: false
                }
            }
        );

        console.log("Migration completed successfully");
        console.log(`Updated ${result.modifiedCount} messages`);

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
};

// Run the migration
migration();