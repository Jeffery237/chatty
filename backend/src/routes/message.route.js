import express from "express";
import {protectedRoute} from "../middleware/auth.middleware.js"
import { 
    getUsersForSidebar, 
    getMessages, 
    sendMessage,
    editMessage,
    deleteMessage,
    replyToMessage,
    markMessageAsRead
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectedRoute, getUsersForSidebar);
router.get("/:id", protectedRoute, getMessages);
router.post("/send/:id", protectedRoute, sendMessage);
router.put("/edit/:messageId", protectedRoute, editMessage);
router.delete("/delete/:messageId", protectedRoute, deleteMessage);
router.post("/reply/:messageId", protectedRoute, replyToMessage);
router.put("/read/:messageId", protectedRoute, markMessageAsRead);


export default router;