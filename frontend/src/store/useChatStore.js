import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  replyingTo: null,

  //error state handling
  error: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  getUsers: async () => {
    set({ isUsersLoading: true, error: null });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch users";
      set({ error: errorMessage });
      toast.error(errorMessage);
      return [];
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    if (!userId) return;
    
    set({ isMessagesLoading: true, error: null });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch messages";
      set({ error: errorMessage });
      toast.error(errorMessage);
      return [];
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
  const { selectedUser, messages } = get();
  if (!selectedUser?._id || !messageData) return;

  set({ error: null });
  try {
    const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
    const updatedMessages = [...messages, res.data];
    set({ messages: updatedMessages });
    return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to send message";
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    }
  },

  editMessage: async (messageId, newText) => {
    set({ error: null });
    try {
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, { text: newText });
      set(state => ({
        messages: state.messages.map(message => 
          message._id === messageId ? res.data : message
        )
      }));
      toast.success("Message edited successfully");
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to edit message";
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    }
  },

  deleteMessage: async (messageId) => {
    set({ error: null });
    try {
      await axiosInstance.delete(`/messages/delete/${messageId}`);
      set(state => ({
        messages: state.messages.map(message => 
          message._id === messageId 
            ? { ...message, isDeleted: true, text: "This message has been deleted", image: null }
            : message
        )
      }));
      toast.success("Message deleted successfully");
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to delete message";
      set({ error: errorMessage });
      toast.error(errorMessage);
    }
  },

  replyToMessage: async (messageId, messageData) => {
    const { selectedUser } = get();
    if (!selectedUser?._id || !messageData) return;

    set({ error: null });
    try {
      const res = await axiosInstance.post(`/messages/reply/${messageId}`, messageData);
      set(state => ({
        messages: [...state.messages, res.data],
        replyingTo: null // Clear reply state after sending
      }));
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to send reply";
      set({ error: errorMessage });
      toast.error(errorMessage);
      return null;
    }
  },

  markMessageAsRead: async (messageId) => {
    try {
      const res = await axiosInstance.put(`/messages/read/${messageId}`);
      set(state => ({
        messages: state.messages.map(message => 
          message._id === messageId ? { ...message, readBy: res.data.readBy } : message
        )
      }));
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  },

  setReplyingTo: (message) => {
    set({ replyingTo: message });
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) {
      console.warn('Socket connection not available');
      return;
    }

    get().unsubscribeFromMessages();

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set((state) => ({
        messages: [...state.messages, newMessage],
      }));
      
      // Mark message as read automatically if it's received
      if (newMessage.senderId === selectedUser._id) {
        get().markMessageAsRead(newMessage._id);
      }
    });

    socket.on("messageEdited", (editedMessage) => {
      set(state => ({
        messages: state.messages.map(message => 
          message._id === editedMessage._id ? editedMessage : message
        )
      }));
    });

    socket.on("messageDeleted", (messageId) => {
      set(state => ({
        messages: state.messages.map(message => 
          message._id === messageId 
            ? { ...message, isDeleted: true, text: "This message has been deleted", image: null }
            : message
        )
      }));
    });

    socket.on("messageRead", ({ messageId, readBy }) => {
      set(state => ({
        messages: state.messages.map(message => 
          message._id === messageId ? { ...message, readBy } : message
        )
      }));
    });
  },


  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("messageEdited");
      socket.off("messageDeleted");
      socket.off("messageRead");
    }
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser });
    if (selectedUser) {
      get().getMessages(selectedUser._id);
    }
  },

  // Cleanup method
  cleanup: () => {
    set({
      messages: [],
      selectedUser: null,
      error: null
    });
    get().unsubscribeFromMessages();
  }

}));