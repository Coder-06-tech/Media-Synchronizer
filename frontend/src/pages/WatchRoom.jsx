import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../api';
import { socket } from '../socket/socketClient';
import VideoPlayer from '../components/VideoPlayer';
import VideoJSPlayer from '../components/VideoJSPlayer';
import Chat from '../components/Chat';
import { Users, Wifi, AlertTriangle, List, Plus, Trash2, Search, Link as LinkIcon, UserPlus, X, Radio } from 'lucide-react';

const STUN_SERVER = 'stun:stun.l.google.com:19302';

const WatchRoom = () => {
    const { roomId } = useParams();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    
    const [roomDetails, setRoomDetails] = useState(null);
    const [isBroadcaster, setIsBroadcaster] = useState(false);
    const [participants, setParticipants] = useState([]);
    
    // WebRTC and Media State
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const peerConnections = useRef({});
    const activePeers = useRef(new Set());
    
    // Sync State
    const [videoUrl, setVideoUrl] = useState('');
    const [playingState, setPlayingState] = useState('paused');
    const [currentTimestamp, setCurrentTimestamp] = useState(0);
    const [healthStatus, setHealthStatus] = useState('connected');
    const [latency, setLatency] = useState(0);
    const [viewerCount, setViewerCount] = useState(1);
    const [cameraActive, setCameraActive] = useState(false);

    // Feature States: Playlist & Search
    const [playlist, setPlaylist] = useState([]);
    const [urlInput, setUrlInput] = useState('');
    const [showPlaylist, setShowPlaylist] = useState(true);

    // 0. Terminal Logs State
    const [terminalLogs, setTerminalLogs] = useState([
        { id: 'init', msg: '> ENCRYPTED SESSION INITIALIZED', type: 'success' },
        { id: 'auth', msg: `> CURRENT_AUTHORITY: ${(user?.name || 'UNKNOWN').toUpperCase()}`, type: 'system' }
    ]);

    const addLog = (msg, type = 'info') => {
        setTerminalLogs(prev => [...prev.slice(-12), { id: Date.now() + Math.random(), msg: `> ${msg.toUpperCase()}`, type }]);
    };

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [friends, setFriends] = useState([]);
    const [inviting, setInviting] = useState(false);

    // 1. Join Room & Fetch Data
    useEffect(() => {
        const joinRoom = async () => {
            try {
                const { data } = await api.post(`/rooms/${roomId}/join`);
                setRoomDetails(data);
                setIsBroadcaster(data.broadcaster === user._id);
                setParticipants(data.participants || []);
                
                socket.emit('join_room', { roomId, isBroadcaster: data.broadcaster === user._id, userId: user._id });
            } catch (error) {
                console.error("Failed to join room", error);
                navigate('/events');
            }
        };
        joinRoom();

        return () => {
            Object.values(peerConnections.current).forEach(pc => pc.close());
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            api.post(`/rooms/${roomId}/leave`).catch(e=>console.log(e));
        };
    }, [roomId, user._id, navigate]);

    // 2. WebRTC & Sync Logic
    useEffect(() => {
        if (!socket) return;

        socket.on('user_joined', async ({ userId }) => {
            addLog(`New subject detected: ${userId.slice(-6)}`, 'warning');
            activePeers.current.add(userId);
            setParticipants(prev => (Array.isArray(prev) && !prev.includes(userId)) ? [...prev, userId] : prev);
            if (isBroadcaster && localStream) {
                const pc = createPeerConnection(userId, localStream);
                peerConnections.current[userId] = pc;
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('offer', { roomId, offer, receiverId: userId });
            }
        });

        socket.on('user_left', ({ userId }) => {
            addLog(`Subject disconnected: ${userId.slice(-6)}`, 'danger');
            activePeers.current.delete(userId);
            setParticipants(prev => prev.filter(id => id !== userId));
            if (peerConnections.current[userId]) {
                peerConnections.current[userId].close();
                delete peerConnections.current[userId];
            }
        });

        // -------------------------------------------------------------
        // NEW WEBRTC SIGNALING PATTERN (TannerGabriel Reference)
        // -------------------------------------------------------------

        // 1. Broadcaster Announces Feed is Active
        socket.on('broadcaster_live', ({ broadcasterId }) => {
            if (!isBroadcaster && !peerConnections.current[broadcasterId]) {
                addLog(`Broadcaster feed available: Requesting Uplink`, 'warning');
                // Listener asks for a connection
                socket.emit('watcher_request', { roomId });
            }
        });

        // 2. Broadcaster Receives Watcher Request & Initiates Offer
        socket.on('watcher_request', async ({ watcherId }) => {
            if (isBroadcaster && localStream) {
                addLog(`Authorizing new watcher uplink: ${watcherId.slice(-6)}`, 'success');
                activePeers.current.add(watcherId);
                const pc = createPeerConnection(watcherId, localStream);
                peerConnections.current[watcherId] = pc;
                
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit('offer', { roomId, offer, receiverId: watcherId });
                } catch (err) {
                    console.error("Offer creation failed", err);
                }
            }
        });

        // 3. Listener Receives Offer & Responds with Answer
        socket.on('offer', async ({ offer, senderId }) => {
            if (!isBroadcaster) {
                addLog(`Inbound signal offer from Broadcaster`, 'system');
                let pc = peerConnections.current[senderId];
                
                if (!pc) {
                    pc = createPeerConnection(senderId);
                    peerConnections.current[senderId] = pc;
                }

                try {
                    if (pc.signalingState !== 'stable') {
                        // Avoid InvalidStateError if offer arrives out of sequence
                        await Promise.all([
                            pc.setLocalDescription({type: "rollback"}),
                            pc.setRemoteDescription(new RTCSessionDescription(offer))
                        ]);
                    } else {
                        await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    }
                    
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('answer', { roomId, answer, receiverId: senderId });
                } catch (err) {
                    console.warn('Offer negotiation failed:', err);
                }
            }
        });

        // 4. Broadcaster Receives Answer & Finalizes
        socket.on('answer', async ({ answer, senderId }) => {
            const pc = peerConnections.current[senderId];
            if (pc && pc.signalingState !== 'stable') {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (err) {
                    console.warn('Answer negotiation failed:', err);
                }
            }
        });

        // 5. ICE Candidates for NAT Traversal
        socket.on('ice_candidate', async ({ candidate, senderId }) => {
            const pc = peerConnections.current[senderId];
            if (pc) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.warn('ICE Candidate failed:', err);
                }
            }
        });

        socket.on('play_video', ({ timestamp, url }) => {
            if (!isBroadcaster) {
                addLog(`Remote Play Signal at ${Math.round(timestamp || 0)}s`, 'success');
                setPlayingState('playing');
                setCurrentTimestamp(timestamp || 0);
                if (url) setVideoUrl(url);
            }
        });

        socket.on('pause_video', ({ timestamp }) => {
            if (!isBroadcaster) {
                addLog(`Remote Pause Signal at ${Math.round(timestamp)}s`, 'info');
                setPlayingState('paused');
                setCurrentTimestamp(timestamp);
            }
        });

        socket.on('seek_video', ({ timestamp }) => {
            if (!isBroadcaster) {
                addLog(`Seeking to ${Math.round(timestamp)}s`, 'info');
                setCurrentTimestamp(timestamp);
            }
        });

        socket.on('sync_response', ({ timestamp, playingState: authoritativePlaying, videoUrl: authoritativeUrl }) => {
            if (!isBroadcaster) {
                setCurrentTimestamp(timestamp);
                setPlayingState(authoritativePlaying);
                if (authoritativeUrl) setVideoUrl(authoritativeUrl);
            }
        });

        socket.on('ping_health', ({ senderId, timestamp }) => {
             socket.emit('pong_health', { timestamp, requesterId: senderId });
        });

        socket.on('pong_health', ({ timestamp }) => {
             const rt = Date.now() - timestamp;
             setLatency(rt);
             setHealthStatus(rt > 500 ? 'warning' : 'connected');
        });

        socket.on('playlist_updated', (newPlaylist) => {
            addLog(`Playlist updated: ${newPlaylist.length} items`, 'system');
            setPlaylist(newPlaylist);
        });

        // --- PRODUCTION BROADCAST SYNC EVENTS ---
        socket.on('sync_time', ({ serverTime }) => {
            if (!isBroadcaster) {
                setCurrentTimestamp(serverTime);
            }
        });

        socket.on('sync_state', (state) => {
            if (!isBroadcaster && state) {
                if (state.videoUrl) setVideoUrl(state.videoUrl);
                if (state.timestamp != null) setCurrentTimestamp(state.timestamp);
                setPlayingState(state.isPlaying ? 'playing' : 'paused');
                addLog('Synchronized with live broadcast state.', 'success');
            }
        });

        socket.on('viewer_count', ({ count }) => {
            setViewerCount(count);
            addLog(`Network density: ${count} agents online`, 'info');
        });

        return () => {
            socket.off('user_joined');
            socket.off('user_left');
            socket.off('offer');
            socket.off('answer');
            socket.off('ice_candidate');
            socket.off('play_video');
            socket.off('pause_video');
            socket.off('seek_video');
            socket.off('sync_response');
            socket.off('ping_health');
            socket.off('pong_health');
            socket.off('playlist_updated');
            socket.off('sync_time');
            socket.off('sync_state');
            socket.off('viewer_count');
        };
    }, [isBroadcaster, localStream, roomId, socket]);

    // 3. Authoritative Sync & Pulse (Broadcaster)
    useEffect(() => {
        if (!socket) return;
        const interval = setInterval(() => {
            socket.emit('ping_health', { roomId });
            if (!isBroadcaster) socket.emit('sync_request', { roomId });
        }, 5000);

        // Production Heartbeat Pulse (Every 3 seconds)
        const pulseInterval = setInterval(() => {
            if (isBroadcaster && playingState === 'playing') {
                socket.emit('sync_pulse', { roomId, timestamp: currentTimestamp, userId: user._id });
            }
        }, 3000);

        // Fetch friends for inviting
        api.get('/friends').then(({ data }) => setFriends(data)).catch(e => console.log(e));

        return () => {
            clearInterval(interval);
            clearInterval(pulseInterval);
        };
    }, [roomId, isBroadcaster, socket, playingState, currentTimestamp]);

    useEffect(() => {
        if (!socket) return;
        const handleSyncRequest = ({ senderId }) => {
            if (isBroadcaster) {
                socket.emit('sync_response', { 
                    requesterId: senderId, 
                    timestamp: currentTimestamp, 
                    playingState: playingState || 'paused',
                    videoUrl: videoUrl || ''
                });
            }
        };
        socket.on('sync_request', handleSyncRequest);
        return () => socket.off('sync_request', handleSyncRequest);
    }, [isBroadcaster, currentTimestamp, playingState, videoUrl, socket]);

    // Helper: Peer Connection
    const createPeerConnection = (partnerId, stream) => {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: STUN_SERVER }] });
        pc.onicecandidate = (event) => {
            if (event.candidate) socket.emit('ice_candidate', { roomId, candidate: event.candidate, receiverId: partnerId });
        };
        if (stream) stream.getTracks().forEach(track => pc.addTrack(track, stream));
        pc.ontrack = (event) => setRemoteStreams(prev => ({ ...prev, [partnerId]: event.streams[0] }));
        return pc;
    };

    // 4. Feature Actions
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
        
        // Native local file streaming logic
        const hiddenVideo = document.createElement('video');
        hiddenVideo.src = url;
        hiddenVideo.muted = true;
        hiddenVideo.play().then(() => {
             const stream = hiddenVideo.captureStream ? hiddenVideo.captureStream() : hiddenVideo.mozCaptureStream ? hiddenVideo.mozCaptureStream() : null;
             if (stream) {
                 setLocalStream(stream);
                 addLog("LOCAL FILE SIGNAL UPLINK ACTIVE", "success");
                 socket.emit('play_video', { roomId, timestamp: 0, url: 'local_stream' });
                 
                 // Broadcast to all that the stream is ready
                 socket.emit('broadcaster_live', { roomId });
             }
        });
    };

    const toggleCamera = async () => {
        if (cameraActive) {
            localStream?.getTracks().forEach(t => t.stop());
            setLocalStream(null);
            setCameraActive(false);
            addLog("NEURAL CAMERA FEED CUT", "warning");
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
                setCameraActive(true);
                addLog("NEURAL CAMERA FEED ESTABLISHED", "success");
                
                // Announce that the camera feed is ready and waiting for watcher requests
                socket.emit('broadcaster_live', { roomId });
            } catch (err) {
                console.error("Camera failed", err);
                addLog("CAMERA UPLINK FAILED: PERMISSION DENIED", "danger");
            }
        }
    };

    const handleUrlSubmit = (e) => {
        e.preventDefault();
        if (!urlInput.trim()) return;
        
        if (isBroadcaster) {
            setVideoUrl(urlInput);
            setPlayingState('playing');
            setCurrentTimestamp(0);
            socket.emit('play_video', { roomId, timestamp: 0, url: urlInput });
        } else {
            setPlaylist(prev => [...prev, { url: urlInput, id: Date.now(), addedBy: user.name }]);
        }
        setUrlInput('');
    };

    const addToPlaylist = () => {
        if (!urlInput) return;
        const newItem = { id: Date.now(), url: urlInput, addedBy: user.name };
        const updated = [...playlist, newItem];
        setPlaylist(updated);
        socket.emit('update_playlist', { roomId, playlist: updated });
        setUrlInput('');
    };

    const removePlaylistEntry = (id) => {
        const updated = playlist.filter(item => item.id !== id);
        setPlaylist(updated);
        socket.emit('update_playlist', { roomId, playlist: updated });
    };

    const playFromPlaylist = (url) => {
        if (!isBroadcaster) return;
        setVideoUrl(url);
        setPlayingState('playing');
        setCurrentTimestamp(0);
        socket.emit('play_video', { roomId, timestamp: 0, url });
    };

    const handleInvite = async (friendId) => {
        try {
            setInviting(true);
            await api.post(`/rooms/${roomId}/invite`, { friendIds: [friendId] });
            addLog(`Invitation pulse sent to subject ${friendId.slice(-4)}`, 'success');
        } catch (error) {
            addLog(`Communication breakdown during invite`, 'danger');
        } finally {
            setInviting(false);
        }
    };

    // Video Control Wrappers
    const handlePlay = (time) => {
        setPlayingState('playing');
        setCurrentTimestamp(time);
        socket.emit('play_video', { roomId, timestamp: time });
    };

    const handlePause = (time) => {
        setPlayingState('paused');
        setCurrentTimestamp(time);
        socket.emit('pause_video', { roomId, timestamp: time });
    };

    const handleSeek = (time) => {
        setCurrentTimestamp(time);
        socket.emit('seek_video', { roomId, timestamp: time });
    };

    if (!roomDetails) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-black/60 gap-6">
                <div className="w-16 h-16 border-4 border-stranger-red border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-orbitron tracking-[0.5em] text-stranger-red animate-pulse">ESTABLISHING SECURE UPLINK...</p>
                <div className="text-[10px] font-mono text-gray-700 uppercase">Uplink Target: {roomId}</div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-8 h-screen flex flex-col overflow-hidden">
            {/* HUD Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 glass-card p-6 border border-stranger-red/30 shadow-[0_0_50px_rgba(229,9,20,0.15)] bg-black/40">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-orbitron tracking-[0.2em] text-stranger-red flex items-center gap-3 drop-shadow-[0_0_10px_rgba(229,9,20,0.5)]">
                        <Plus className="animate-spin-slow" /> ROOM_{(roomId || '????').split('-')[0].toUpperCase()}
                    </h2>
                    <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] font-outfit uppercase tracking-widest text-gray-500 bg-white/5 px-2 py-1">
                            SUBJECT: {user?.name || 'AGENT'}
                        </span>
                        <span className="text-[10px] font-outfit uppercase tracking-widest text-stranger-red border border-stranger-red/30 px-2 py-1">
                            LOGLEVEL: {isBroadcaster ? 'AUTHORITY' : 'MONITOR'}
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-8 items-center border-l border-white/10 pl-8">
                    <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-orbitron text-gray-600 tracking-widest">SIGNAL LATENCY</span>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${latency > 500 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                            <span className={`font-mono text-sm ${latency > 500 ? 'text-red-500' : 'text-green-500'}`}>{latency}ms</span>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-orbitron text-gray-600 tracking-widest">UPLINK STATUS</span>
                        <div className="flex items-center gap-2 text-xs font-outfit">
                            {healthStatus === 'connected' ? <><Wifi size={14} className="text-green-500"/> <span className="text-green-500 tracking-widest uppercase">ENCRYPTED</span></> : 
                             healthStatus === 'warning' ? <><AlertTriangle size={14} className="text-yellow-500 animate-flicker"/> <span className="text-yellow-500 tracking-widest uppercase">INTERFERENCE</span></> : 
                             <><Wifi size={14} className="text-red-500"/> <span className="text-red-500 tracking-widest uppercase">SERVER DROP</span></>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 pr-8 border-r border-white/10">
                        <span className="text-[8px] font-orbitron text-gray-600 tracking-widest">AGENTS ACTIVE</span>
                        <div className="flex items-center gap-2">
                            <Users size={14} className="text-stranger-red" />
                            <span className="font-mono text-sm text-white">{viewerCount}</span>
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowInviteModal(true)}
                        className="flex flex-col gap-1 group hover:text-stranger-red transition-all cursor-pointer"
                    >
                        <span className="text-[8px] font-orbitron text-gray-600 tracking-widest group-hover:text-stranger-red transition-colors uppercase">Pulse Invite</span>
                        <div className="flex items-center gap-2">
                            <UserPlus size={16} className="text-stranger-red group-hover:scale-125 transition-transform" />
                            <span className="text-[10px] uppercase font-bold tracking-widest">Transmit Signal</span>
                        </div>
                    </button>
                </div>
            </header>

            {/* Main Content: Video + Chat Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-0">
                
                {/* Left Column: Player & Search */}
                <div className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
                    
                    {/* Media Search/URL Input (Broadcaster Only for Authority) */}
                    {isBroadcaster && (
                        <div className="glass-card p-4 border border-stranger-red/20 bg-black/60 flex flex-col md:flex-row gap-4 items-center">
                            <div className="relative flex-1 w-full">
                                <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stranger-red/50" />
                                <form onSubmit={handleUrlSubmit} className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        placeholder="INPUT EXTERNAL SIGNAL URL (YOUTUBE, TWITCH, DIRECT)..."
                                        className="w-full bg-black/40 border border-stranger-red/30 pl-12 pr-4 py-3 text-xs text-white font-outfit focus:border-stranger-red outline-none transition-all placeholder:text-gray-700"
                                    />
                                    <button 
                                        type="submit"
                                        className="px-6 bg-stranger-red text-black font-orbitron text-[10px] tracking-widest hover:bg-white transition-colors"
                                    >
                                        INITIALIZE
                                    </button>
                                </form>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <button 
                                    onClick={addToPlaylist}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 border border-gray-700 text-[10px] font-orbitron tracking-widest text-gray-400 hover:text-white hover:border-white transition-all"
                                >
                                    <Plus size={14} /> QUEUE
                                </button>
                                <label className="flex-1 md:flex-none cursor-pointer flex items-center justify-center gap-2 px-4 py-3 border border-stranger-red/30 text-[10px] font-orbitron tracking-widest text-stranger-red hover:bg-stranger-red/10 transition-all">
                                    <Plus size={14} /> LOCAL_FILE
                                    <input type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
                                </label>
                                <button 
                                    onClick={toggleCamera}
                                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 border ${cameraActive ? 'border-stranger-red bg-stranger-red/20 text-white' : 'border-gray-700 text-gray-400'} text-[10px] font-orbitron tracking-widest hover:border-white transition-all`}
                                >
                                    <Radio size={14} className={cameraActive ? 'animate-pulse' : ''} /> {cameraActive ? 'FEED_LIVE' : 'GO_LIVE'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Video Player Section */}
                    <div className="relative flex-1 bg-black/40 overflow-hidden group min-h-[500px] border border-white/5 shadow-2xl">
                        {/* Adaptive Player Switcher */}
                        {videoUrl && videoUrl.includes('.m3u8') ? (
                            <VideoJSPlayer 
                                options={{
                                    sources: [{ src: videoUrl, type: 'application/x-mpegURL' }],
                                    autoplay: playingState === 'playing'
                                }}
                                isBroadcaster={isBroadcaster}
                                isPlaying={playingState === 'playing'}
                                currentTimestamp={currentTimestamp}
                                onTimeUpdate={setCurrentTimestamp}
                                onDurationChange={() => {}}
                            />
                        ) : (
                            <VideoPlayer 
                                videoUrl={videoUrl}
                                isBroadcaster={isBroadcaster}
                                isPlaying={playingState === 'playing'}
                                currentTimestamp={currentTimestamp}
                                onPlay={handlePlay}
                                onPause={handlePause}
                                onSeek={handleSeek}
                                playingState={playingState}
                                remoteStream={Object.values(remoteStreams)[0]}
                            />
                        )}

                        {/* WebRTC Overlay for Broadcaster */}
                        {isBroadcaster && localStream && (
                            <div className="absolute top-4 right-4 w-48 aspect-video border-2 border-stranger-red shadow-[0_0_20px_rgba(229,9,20,0.4)] z-30 bg-black overflow-hidden group/pip">
                                <video ref={v => v && (v.srcObject = localStream)} autoPlay muted playsInline className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-stranger-red/10 opacity-0 group-hover/pip:opacity-100 transition-opacity pointer-events-none"></div>
                                <div className="absolute bottom-1 left-2 text-[8px] font-orbitron text-stranger-red tracking-widest">AUTHORITY_FEED</div>
                            </div>
                        )}


                        {/* Broadcast Overlay Info */}
                        <div className="absolute top-4 left-4 z-20 pointer-events-none">
                            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 border border-white/10">
                                <span className={`w-2 h-2 rounded-full ${playingState === 'playing' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
                                <span className="text-[10px] font-orbitron tracking-widest text-white uppercase">{playingState}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Info / Metadata */}
                    <footer className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                        {/* Playlist Section */}
                        <div className="glass-card border border-white/10 bg-black/40 p-6">
                            <h3 className="text-xs font-orbitron tracking-[0.2em] text-gray-400 mb-6 flex items-center justify-between">
                                <span className="flex items-center gap-2"><List size={16}/> SIGNAL QUEUE</span>
                                <span className="opacity-40 text-[10px]">{playlist.length} ITEMS</span>
                            </h3>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {playlist.length === 0 ? (
                                    <div className="py-12 border border-dashed border-white/5 rounded flex flex-col items-center justify-center opacity-20">
                                        <Search size={32} />
                                        <p className="text-[10px] mt-4 tracking-widest font-orbitron">NO SIGNALS IN QUEUE</p>
                                    </div>
                                ) : (
                                    playlist.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 border-l-2 border-transparent hover:border-stranger-red hover:bg-white/10 transition-all group">
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <span className="text-xs font-outfit text-gray-300 truncate pr-4">{item.url}</span>
                                                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-tighter">ADDED BY: {item.addedBy}</span>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {isBroadcaster && (
                                                    <button onClick={() => playFromPlaylist(item.url)} className="p-2 text-green-500 hover:text-white">
                                                        <Plus size={14} />
                                                    </button>
                                                )}
                                                <button onClick={() => removePlaylistEntry(item.id)} className="p-2 text-red-900 hover:text-red-500">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Room Info / Controls Detail */}
                        <div className="glass-card border border-white/10 bg-black/40 p-6">
                             <h3 className="text-xs font-orbitron tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                                <AlertTriangle size={16}/> TERMINAL LOGS
                            </h3>
                            <div className="font-mono text-[9px] space-y-2 uppercase leading-relaxed h-[200px] overflow-y-auto custom-scrollbar">
                                {terminalLogs.map(log => (
                                    <p key={log.id} className={
                                        log.type === 'success' ? 'text-green-600' :
                                        log.type === 'warning' ? 'text-yellow-600' :
                                        log.type === 'danger' ? 'text-red-700' :
                                        log.type === 'system' ? 'text-blue-600' :
                                        'text-gray-600'
                                    }>
                                        {log.msg}
                                    </p>
                                ))}
                                <div className="pt-4 mt-4 border-t border-white/5 opacity-50">
                                    <p className="animate-pulse">STAYING IN THE SHADOWS...</p>
                                </div>
                            </div>
                        </div>
                    </footer>
                </div>

                {/* Right Column: Chat */}
                <div className="lg:col-span-1 h-full min-h-0">
                    <Chat roomId={roomId} socket={socket} user={user} />
                </div>

            </div>

                {/* CRT Flicker Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100] bg-[url('https://media.giphy.com/media/oEI9uWUqW8Kbg9Tsu5/giphy.gif')] bg-cover"></div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowInviteModal(false)}></div>
                    <div className="relative glass-card w-full max-w-md border border-stranger-red/50 shadow-[0_0_100px_rgba(229,9,20,0.3)] p-8 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-stranger-red to-transparent"></div>
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <p className="text-[8px] font-orbitron text-gray-400 tracking-[0.5em] uppercase mb-1">// Outreach Authorization //</p>
                                <h3 className="text-2xl font-orbitron tracking-widest neon-text">INVITE SUBJECTS</h3>
                            </div>
                            <button onClick={() => setShowInviteModal(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {friends.length === 0 ? (
                                <p className="text-[10px] text-gray-600 text-center py-10 tracking-widest uppercase">No available subjects in neural network</p>
                            ) : (
                                friends.map(friend => {
                                    if (!friend) return null;
                                    const isActive = Array.isArray(participants) && participants.includes(friend._id);
                                    return (
                                        <div key={friend._id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 hover:border-stranger-red/30 transition-all duration-300 group">
                                            <div className="flex items-center gap-4">
                                                <img 
                                                    src={friend.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`} 
                                                    className="w-10 h-10 rounded-full border border-gray-800 group-hover:border-stranger-red/50 transition-colors"
                                                    alt=""
                                                />
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-widest">{friend.name}</p>
                                                    <p className="text-[8px] text-gray-600 font-mono">@{friend.username}</p>
                                                </div>
                                            </div>
                                            <button 
                                                disabled={inviting || isActive}
                                                onClick={() => handleInvite(friend._id)}
                                                className="px-4 py-2 bg-stranger-red text-black text-[10px] font-orbitron font-black uppercase tracking-tighter hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                            >
                                                {isActive ? 'Active' : 'Transmit'}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col gap-4 text-center">
                            <p className="text-[8px] text-gray-600 font-mono animate-pulse">ESTABLISHING QUANTUM LINK TO ENCRYPTED SUBJECTS...</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WatchRoom;
