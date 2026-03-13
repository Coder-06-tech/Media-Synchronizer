# Cerebro's Code Red Synchronizer

A full-stack WebRTC application for synchronized video watching with friends, featuring a Stranger Things / 80s retro UI theme.

## Features

- **Authentication**: JWT-based secure login and registration.
- **Social System**: Add friends, search users, and view connections.
- **Events**: Schedule watch parties and invite friends.
- **Watch Rooms**: Instant or scheduled rooms with one Broadcaster and multiple Listeners.
- **WebRTC Streaming**: Direct peer-to-peer video streaming from Broadcaster to Listeners.
- **Real-Time Sync**: Socket.IO powered playback synchronization (auto-correcting drift > 300ms).
- **Retro UI**: Neon red/orange CRT scanline theme using TailwindCSS.

## Tech Stack

- **Frontend**: React (Vite), TailwindCSS, Zustand, Socket.IO Client
- **Backend**: Node.js, Express, MongoDB, Socket.IO Server
- **Networking/RTC**: WebRTC, STUN (stun:stun.l.google.com:19302)

## Setup & Running Locally

### Prerequisites
- Node.js installed
- MongoDB installed and running locally on default port 27017

### 1. Installation
In the project root, open two terminal windows.

Terminal 1 (Backend):
```bash
cd backend
npm install
```

Terminal 2 (Frontend):
```bash
cd frontend
npm install
```

### 2. Configuration
The backend server assumes MongoDB is running at `mongodb://localhost:27017/cerebro-code-red`. A `.env` file is already created in `backend/` for you.

### 3. Running the App
Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

The frontend will start at `http://localhost:5173`.

## Usage Instructions for Testing
1. Open two browser windows (e.g., standard and incognito) and navigate to `http://localhost:5173`.
2. Register User A in window 1, and User B in window 2.
3. User A searches for User B and sends a friend request.
4. User B accepts the request.
5. User A creates an Event or an Instant Broadcast Room.
6. User B joins the linked room.
7. User A selects a video file from their computer (`.mp4` recommended).
8. The video begins streaming to User B.
9. User A uses the play/pause/seek controls, and User B's stream synchronizes automatically.
