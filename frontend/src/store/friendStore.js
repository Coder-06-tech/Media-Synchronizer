import { create } from 'zustand';

const useFriendStore = create((set) => ({
  friends: [],
  pendingRequests: [],
  sentRequests: [],
  setFriends: (friends) => set({ friends }),
  setPendingRequests: (requests) => set({ pendingRequests: requests }),
  setSentRequests: (requests) => set({ sentRequests: requests }),
  addPendingRequest: (request) => set((state) => ({ pendingRequests: [...state.pendingRequests, request] })),
  removePendingRequest: (requestId) => set((state) => ({ pendingRequests: state.pendingRequests.filter(r => r._id !== requestId) }))
}));

export default useFriendStore;
