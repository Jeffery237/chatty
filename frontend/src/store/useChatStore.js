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

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) {
      console.warn('Socket connection not available');
      return;
    }
    // Cleanup existing subscription before creating new one
    get().unsubscribeFromMessages();

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set((state) => ({
        messages: [...state.messages, newMessage],
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
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