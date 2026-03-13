import { create } from 'zustand';

const useRoomStore = create((set) => ({
  room: null,
  isBroadcaster: false,
  peerConnections: {}, // mapping of socketId to RTCPeerConnection
  remoteStreams: {}, // mapping of socketId to MediaStream
  setRoom: (room) => set({ room }),
  setIsBroadcaster: (status) => set({ isBroadcaster: status }),
  addPeerConnection: (socketId, pc) => set((state) => ({ peerConnections: { ...state.peerConnections, [socketId]: pc } })),
  removePeerConnection: (socketId) => set((state) => {
    const newPcs = { ...state.peerConnections };
    delete newPcs[socketId];
    return { peerConnections: newPcs };
  }),
  addRemoteStream: (socketId, stream) => set((state) => ({ remoteStreams: { ...state.remoteStreams, [socketId]: stream } })),
  removeRemoteStream: (socketId) => set((state) => {
    const newStreams = { ...state.remoteStreams };
    delete newStreams[socketId];
    return { remoteStreams: newStreams };
  }),
  clearRoom: () => set({ room: null, isBroadcaster: false, peerConnections: {}, remoteStreams: {} })
}));

export default useRoomStore;
