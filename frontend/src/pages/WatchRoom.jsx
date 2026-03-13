import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../api';
import { socket } from '../socket/socketClient';
import VideoPlayer from '../components/VideoPlayer';
import { Users, Wifi, AlertTriangle } from 'lucide-react';

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
    
    // Sync State
    const [videoUrl, setVideoUrl] = useState('');
    const [playingState, setPlayingState] = useState('paused');
    const [currentTimestamp, setCurrentTimestamp] = useState(0);
    const [healthStatus, setHealthStatus] = useState('connected'); // connected, warning, disconnected
    const [latency, setLatency] = useState(0);

    // 1. Fetch Room Data
    useEffect(() => {
        const joinRoom = async () => {
            try {
                const { data } = await api.post(`/rooms/${roomId}/join`);
                setRoomDetails(data);
                setIsBroadcaster(data.broadcaster === user._id);
                setParticipants(data.participants);
                
                socket.emit('join_room', roomId);
            } catch (error) {
                console.error("Failed to join room", error);
                navigate('/events');
            }
        };
        joinRoom();

        return () => {
            // Cleanup WebRTC connections on unmount
            Object.values(peerConnections.current).forEach(pc => pc.close());
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            api.post(`/rooms/${roomId}/leave`).catch(e=>console.log(e));
        };
    }, [roomId, user._id, navigate]);

    // 2. WebRTC Signaling Handlers
    useEffect(() => {
        socket.on('user_joined', async ({ userId }) => {
            console.log('User joined room:', userId);
            
            // If I am the broadcaster and I have a stream, I need to initiate an offer to the new listener
            if (isBroadcaster && localStream) {
                const pc = createPeerConnection(userId, localStream);
                peerConnections.current[userId] = pc;
                
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit('offer', { roomId, offer, receiverId: userId });
                } catch (error) {
                    console.error("Error creating offer", error);
                }
            }
        });

        socket.on('offer', async ({ offer, senderId }) => {
            console.log('Received offer from', senderId);
            // Listeners receive offers from the Broadcaster
            if (!isBroadcaster) {
                const pc = createPeerConnection(senderId);
                peerConnections.current[senderId] = pc;
                
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('answer', { roomId, answer, receiverId: senderId });
                } catch (error) {
                    console.error("Error handling offer", error);
                }
            }
        });

        socket.on('answer', async ({ answer, senderId }) => {
            console.log('Received answer from', senderId);
            const pc = peerConnections.current[senderId];
            if (pc) {
                 await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        socket.on('ice_candidate', async ({ candidate, senderId }) => {
            const pc = peerConnections.current[senderId];
            if (pc) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (error) {
                    console.error('Error adding received ice candidate', error);
                }
            }
        });

        return () => {
            socket.off('user_joined');
            socket.off('offer');
            socket.off('answer');
            socket.off('ice_candidate');
        };
    }, [isBroadcaster, localStream, roomId]);

    // 3. WebRTC Setup Helper
    const createPeerConnection = (partnerId, stream) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: STUN_SERVER }]
        });

        // Send any ice candidates to the other peer
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice_candidate', { roomId, candidate: event.candidate, receiverId: partnerId });
            }
        };

        // If I am sending a stream (Broadcaster), add tracks
        if (stream) {
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
        }

        // If I am receiving a stream (Listener), handle incoming track
        pc.ontrack = (event) => {
            console.log("Stream received!");
            setRemoteStreams(prev => ({ ...prev, [partnerId]: event.streams[0] }));
        };

        pc.onconnectionstatechange = () => {
             console.log(`Connection state with ${partnerId}: ${pc.connectionState}`);
             if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                 setHealthStatus('warning');
             } else if (pc.connectionState === 'connected') {
                 setHealthStatus('connected');
             }
        };

        return pc;
    };

    // 4. File Selection (Broadcaster only)
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        setVideoUrl(url);

        // Capture stream from the video element (this will happen after the video component renders it)
        // A better approach is to create a hidden video element or captureStream directly
        // However, standard HTML5 file to media stream requires a video element first.
        
        // Let's create an off-screen video to capture stream accurately
        const hiddenVideo = document.createElement('video');
        hiddenVideo.src = url;
        hiddenVideo.muted = true;
        hiddenVideo.play().then(() => {
             let stream;
             if (hiddenVideo.captureStream) {
                 stream = hiddenVideo.captureStream();
             } else if (hiddenVideo.mozCaptureStream) {
                 stream = hiddenVideo.mozCaptureStream();
             } else {
                 alert("Your browser doesn't support capturing streams from local files.");
                 return;
             }
             
             setLocalStream(stream);

             // Now initiate WebRTC connections with all current participants
             // In a real app we'd track socket IDs. For simplicity here, we rely on them reconnecting
             // or requesting streams, or we emit a "stream_ready" event.
             socket.emit('play_video', { roomId, timestamp: 0 }); // Alert others
             
             // Simple approach: Alert room that stream is ready, have them request it
             alert("Local media loaded. Listeners should refresh or await connection.");
        });
    };

    // 5. Video Sync Sockets
    useEffect(() => {
        socket.on('play_video', ({ timestamp }) => {
            if (!isBroadcaster) {
                setPlayingState('playing');
                setCurrentTimestamp(timestamp);
            }
        });

        socket.on('pause_video', ({ timestamp }) => {
            if (!isBroadcaster) {
                setPlayingState('paused');
                setCurrentTimestamp(timestamp);
            }
        });

        socket.on('seek_video', ({ timestamp }) => {
            if (!isBroadcaster) {
                setCurrentTimestamp(timestamp);
            }
        });

        socket.on('ping_health', ({ senderId, timestamp }) => {
             socket.emit('pong_health', { timestamp, requesterId: senderId });
        });

        socket.on('pong_health', ({ timestamp }) => {
             const rt = Date.now() - timestamp;
             setLatency(rt);
             if (rt > 500) setHealthStatus('warning');
             else setHealthStatus('connected');
        });

        return () => {
            socket.off('play_video');
            socket.off('pause_video');
            socket.off('seek_video');
            socket.off('ping_health');
            socket.off('pong_health');
        };
    }, [isBroadcaster]);

    // Periodically send health pings
    useEffect(() => {
        const interval = setInterval(() => {
            socket.emit('ping_health', { roomId });
            // If listener, request sync update periodically
            if (!isBroadcaster) {
                socket.emit('sync_request', { roomId });
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [roomId, isBroadcaster]);

    socket.on('sync_request', ({ senderId }) => {
        if (isBroadcaster) {
            // Broadcaster sends current authoritative state
            socket.emit('sync_response', { 
                requesterId: senderId, 
                timestamp: currentTimestamp, 
                playingState 
            });
        }
    });

    socket.on('sync_response', ({ timestamp, playingState }) => {
        if (!isBroadcaster) {
            setCurrentTimestamp(timestamp);
            setPlayingState(playingState);
        }
    });

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

    // Render primary remote stream for listeners
    const mainRemoteStream = Object.values(remoteStreams)[0]; // Just grab the first one assuming 1 broadcaster

    return (
        <div className="max-w-6xl mx-auto py-4">
            {/* Header info */}
            <div className="flex justify-between items-center mb-6 bg-black/60 p-4 border border-stranger-red neon-border">
                <div>
                    <h2 className="text-xl uppercase tracking-widest text-stranger-red flex items-center gap-2">
                        <Users size={20} /> Room: {roomId.split('-')[0]}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-mono">
                        Role: {isBroadcaster ? 'BROADCASTER (AUTHORITATIVE)' : 'LISTENER (SYNCED)'}
                    </p>
                </div>

                <div className="flex gap-6 items-center">
                    <div className="flex items-center gap-2 text-sm uppercase tracking-widest">
                        <span className="text-gray-500">Latency:</span>
                        <span className={latency > 500 ? 'text-red-500 blink' : 'text-green-500'}>
                            {latency}ms
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm uppercase tracking-widest">
                        <span className="text-gray-500">Uplink:</span>
                        {healthStatus === 'connected' && <span className="text-green-500 flex items-center gap-1"><Wifi size={16}/> STABLE</span>}
                        {healthStatus === 'warning' && <span className="text-yellow-500 blink flex items-center gap-1"><AlertTriangle size={16}/> UNSTABLE</span>}
                        {healthStatus === 'disconnected' && <span className="text-red-500 flex items-center gap-1"><Wifi size={16}/> DROPPED</span>}
                    </div>
                </div>
            </div>

            {/* Video Player Area */}
            <div className="mb-6">
                <VideoPlayer 
                    isBroadcaster={isBroadcaster}
                    videoUrl={videoUrl}
                    remoteStream={mainRemoteStream}
                    playingState={playingState}
                    currentTimestamp={currentTimestamp}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onSeek={handleSeek}
                />
            </div>

            {/* Controls panel */}
            {isBroadcaster && (
                <div className="bg-black/80 p-6 border-t border-stranger-red">
                    <h3 className="text-stranger-red uppercase tracking-widest mb-4 font-bold flex items-center gap-2">
                        <AlertTriangle size={18}/> Broadcaster Terminal Core
                    </h3>
                    
                    <div className="inline-block relative">
                         <input 
                            type="file" 
                            accept="video/*" 
                            onChange={handleFileSelect}
                            className="hidden"
                            id="video-upload"
                         />
                         <label htmlFor="video-upload" className="cursor-pointer px-6 py-3 border border-stranger-red text-stranger-red uppercase tracking-widest text-sm hover:bg-stranger-red hover:text-black transition-colors font-bold inline-block">
                             {localStream ? 'CHANGE MEDIA SOURCE' : 'INITIALIZE LOCAL MEDIA'}
                         </label>
                    </div>
                    {localStream && <p className="text-xs text-green-500 mt-3 font-mono">✓ Local media captured and streaming to peers.</p>}
                </div>
            )}
        </div>
    );
};

export default WatchRoom;
