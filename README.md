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

## System Architecture

### Overview
VideoSync implements a hybrid architecture combining WebRTC peer-to-peer streaming with centralized Socket.IO signaling and state management. The system is designed for horizontal scalability using Redis as a distributed message broker.

### Architecture Layers

#### 1. Client Layer (Frontend)
- **React SPA**: Single-page application built with Vite for fast development and optimized production builds
- **State Management**: Zustand stores manage authentication, user sessions, and room states
- **Real-Time Communication**: Socket.IO client maintains persistent WebSocket connections for signaling and synchronization
- **WebRTC Peer Connections**: Direct browser-to-browser video streaming using RTCPeerConnection API
- **UI Framework**: TailwindCSS with custom retro/CRT theme styling

#### 2. API Layer (Backend REST)
- **Express.js Server**: RESTful API endpoints for CRUD operations
- **Route Modules**:
  - `/api/auth`: JWT-based authentication (login, register, token validation)
  - `/api/users`: User profile management and search
  - `/api/friends`: Friend request system (send, accept, reject)
  - `/api/rooms`: Video room creation and management
  - `/api/events`: Scheduled watch party events
  - `/api/notifications`: Real-time notification delivery
- **Middleware**: JWT verification, CORS handling, request logging
- **File Uploads**: Multer for handling video file uploads with optional Cloudinary integration

#### 3. Real-Time Layer (Socket.IO)
The backend implements three modular socket namespaces:

**a) Signaling Sockets** (`signaling.js`)
- WebRTC signaling server following the broadcaster-watcher pattern
- Handles SDP offer/answer exchange between peers
- ICE candidate relay for NAT traversal
- User presence management (join/leave notifications)

**b) Video Sync Sockets** (`videoSync.js`)
- Playback state synchronization (play, pause, seek events)
- Sync request/response protocol for late joiners
- Connection health monitoring via ping/pong heartbeats
- In-room chat messaging system

**c) Broadcast Engine** (`broadcastEngine.js`)
- Stateful room session management
- Persistent state storage (Redis or in-memory fallback)
- 3-second sync pulse from broadcaster to correct drift over 300ms
- Viewer count tracking and broadcasting
- Initial state delivery for new joiners

#### 4. Data Layer
**MongoDB (Persistent Storage)**
- **User Collection**: Authentication credentials (bcrypt hashed), profiles, friend lists
- **VideoRoom Collection**: Room metadata, broadcaster info, participant lists
- **Event Collection**: Scheduled watch parties with invitations
- **FriendRequest Collection**: Pending/accepted friend relationships
- **Notification Collection**: User notifications and alerts

**Redis (Distributed Cache)**
- Session state synchronization across multiple backend instances
- Socket.IO adapter for cross-server event broadcasting
- Room state caching with 24-hour TTL
- Enables horizontal scaling of the backend

#### 5. Media Streaming Architecture
**WebRTC Data Flow**:
1. Broadcaster selects local video file
2. Video stream captured via `getUserMedia()` or file stream
3. RTCPeerConnection established through Socket.IO signaling
4. Direct P2P video transmission (bypasses server for bandwidth efficiency)
5. STUN server (Google's public STUN) used for NAT traversal
6. Fallback to TURN relay if P2P connection fails (not implemented in base config)

**Synchronization Protocol**:
- Broadcaster emits playback events (play/pause/seek) via Socket.IO
- Backend broadcasts events to all room participants
- Listeners auto-correct playback position if drift exceeds 300ms
- 3-second heartbeat pulse maintains continuous sync
- Late joiners request current state via sync_request/sync_response

### Deployment Architecture

**Development Mode**:
- Frontend: Vite dev server on port 5173
- Backend: Node.js server on port 5000
- MongoDB: Local instance on port 27017
- Redis: Optional, falls back to in-memory sessions

**Production Mode (Docker)**:
- Multi-container setup via docker-compose
- Backend service with Redis adapter for scaling
- MongoDB container with persistent volume
- Redis container for distributed state
- Frontend served as static build or separate container
- Bridge network for inter-container communication

### Scalability Considerations
- **Horizontal Scaling**: Redis adapter enables multiple backend instances to share Socket.IO events
- **Database Indexing**: MongoDB indexes on userId, roomId for fast queries
- **WebRTC Offloading**: Video streaming bypasses server, reducing bandwidth costs
- **Session Expiry**: Redis TTL prevents memory leaks from abandoned rooms
- **Stateless API**: REST endpoints can be load-balanced independently

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
