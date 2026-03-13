import { useRef, useEffect, useState } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, FileVideo, FastForward, Rewind } from 'lucide-react';

const VideoPlayer = ({ 
    isBroadcaster, 
    videoUrl, 
    onPlay, 
    onPause, 
    onSeek, 
    currentTimestamp, 
    playingState,
    remoteStream
}) => {
    const videoRef = useRef(null);
    const playerRef = useRef(null);
    const containerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const isOnlineVideo = videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.includes('twitch.tv') || videoUrl.includes('vimeo.com') || videoUrl.includes('facebook.com') || videoUrl.includes('dailymotion.com'));

    // Sync remote state for Online Vid (ReactPlayer)
    useEffect(() => {
        if (isBroadcaster || !isOnlineVideo) return;
        setIsPlaying(playingState === 'playing');
    }, [playingState, isOnlineVideo, isBroadcaster]);

    useEffect(() => {
        if (isBroadcaster || !isOnlineVideo || !playerRef.current) return;
        try {
            const player = playerRef.current;
            if (typeof player.getCurrentTime === 'function') {
                const drift = Math.abs(player.getCurrentTime() - currentTimestamp);
                if (drift > 1.5) { 
                    player.seekTo(currentTimestamp, 'seconds');
                }
            }
        } catch (e) {
            console.error("ReactPlayer Sync Error", e);
        }
    }, [currentTimestamp, isOnlineVideo, isBroadcaster]);

    // Sync remote state for Local/WebRTC (Native Video)
    useEffect(() => {
        if (!videoRef.current || isBroadcaster || isOnlineVideo) return;

        if (playingState === 'playing' && videoRef.current.paused) {
            videoRef.current.play().catch(e => console.warn('Autoplay prevented', e));
            setIsPlaying(true);
        } else if (playingState === 'paused' && !videoRef.current.paused) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [playingState, isBroadcaster, isOnlineVideo]);

    // Sync local native video with isPlaying state (Broadcaster)
    useEffect(() => {
        if (!videoRef.current || !isBroadcaster || isOnlineVideo) return;
        if (isPlaying && videoRef.current.paused) {
            videoRef.current.play().catch(e => console.warn("Broadcaster play failed", e));
        } else if (!isPlaying && !videoRef.current.paused) {
            videoRef.current.pause();
        }
    }, [isPlaying, isBroadcaster, isOnlineVideo]);

    useEffect(() => {
        if (!videoRef.current || isBroadcaster || isOnlineVideo) return;
        const drift = Math.abs(videoRef.current.currentTime - currentTimestamp);
        if (drift > 0.5) {
            videoRef.current.currentTime = currentTimestamp;
        }
    }, [currentTimestamp, isBroadcaster, isOnlineVideo]);

    useEffect(() => {
        if (!isBroadcaster && remoteStream && videoRef.current && !isOnlineVideo) {
            if (videoRef.current.srcObject !== remoteStream) {
                videoRef.current.srcObject = remoteStream;
            }
        }
    }, [isBroadcaster, remoteStream, isOnlineVideo]);

    const handlePlayPause = () => {
        if (!isBroadcaster) return;
        
        const nextPlaying = !isPlaying;
        setIsPlaying(nextPlaying);
        
        let time = 0;
        if (isOnlineVideo && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
            time = playerRef.current.getCurrentTime();
        } else if (videoRef.current) {
            time = videoRef.current.currentTime;
        }
        
        if (nextPlaying) onPlay(time);
        else onPause(time);
    };

    const handleSeek = (e) => {
        if (!isBroadcaster) return;
        const time = (e.nativeEvent.offsetX / e.currentTarget.offsetWidth) * (duration || 0);
        
        if (isOnlineVideo && playerRef.current && typeof playerRef.current.seekTo === 'function') {
            playerRef.current.seekTo(time, 'seconds');
        } else if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
        
        setCurrentTime(time);
        onSeek(time);
    };

    const handleSkip = (amount) => {
        if (!isBroadcaster) return;
        
        let newTime;
        if (isOnlineVideo && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
            newTime = playerRef.current.getCurrentTime() + amount;
            playerRef.current.seekTo(newTime, 'seconds');
        } else if (videoRef.current) {
            newTime = videoRef.current.currentTime + amount;
            videoRef.current.currentTime = newTime;
        } else {
            return;
        }
        
        setCurrentTime(newTime);
        onSeek(newTime);
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    const handleVolumeChange = (e) => {
        const value = parseFloat(e.target.value);
        setVolume(value);
        setIsMuted(value === 0);
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const formatTime = (timeInSeconds) => {
        if (isNaN(timeInSeconds)) return "00:00";
        const m = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
        const s = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div ref={containerRef} className="relative group bg-black border-2 border-stranger-red/50 overflow-hidden shadow-[0_0_30px_rgba(229,9,20,0.2)] ring-1 ring-stranger-red/20 w-full h-full flex items-center justify-center">
            {!videoUrl && !remoteStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050507] z-10">
                    <div className="relative mb-6">
                        <FileVideo size={64} className="text-gray-800" />
                        <div className="absolute inset-0 bg-stranger-red/10 blur-xl rounded-full"></div>
                    </div>
                    <p className="text-gray-500 text-[10px] font-orbitron tracking-[0.4em] animate-pulse uppercase">Searching for Signal...</p>
                    {isBroadcaster && <p className="text-[8px] text-stranger-red/60 mt-4 font-outfit uppercase tracking-widest text-center px-4">Input Media Source below or Upload Local File in Terminal</p>}
                </div>
            )}
            
            {isOnlineVideo ? (
                <div className="w-full h-full pointer-events-none">
                    <ReactPlayer
                        ref={playerRef}
                        url={videoUrl}
                        playing={isPlaying}
                        volume={volume}
                        muted={isMuted}
                        width="100%"
                        height="100%"
                        onProgress={(state) => setCurrentTime(state.playedSeconds)}
                        onDuration={(d) => setDuration(d)}
                        progressInterval={1000}
                        config={{
                            youtube: { playerVars: { disablekb: 1, modestbranding: 1, rel: 0, autoplay: 1 } }
                        }}
                    />
                </div>
            ) : (
                <video 
                    ref={videoRef}
                    src={videoUrl === 'local_stream' ? undefined : (videoUrl || undefined)}
                    className="w-full h-full object-contain"
                    onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
                    onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
                    autoPlay={!isBroadcaster}
                    muted={isMuted}
                    playsInline
                />
            )}

            {/* Custom Controls UI */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-6 transition-all duration-500 ease-out z-20">
                {/* Progress Bar */}
                <div 
                    className={`w-full h-1.5 bg-gray-800 mb-6 cursor-pointer relative group/progress transition-all hover:h-2 ${!isBroadcaster && 'pointer-events-none'}`}
                    onClick={handleSeek}
                >
                    <div 
                        className="h-full bg-stranger-red shadow-[0_0_10px_rgba(229,9,20,0.8)]"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                    <div 
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-4 border-stranger-red rounded-full transition-all scale-0 group-hover/progress:scale-100 shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                        style={{ left: `calc(${(currentTime / duration) * 100}% - 8px)` }}
                    />
                </div>

                <div className="flex justify-between items-center text-white">
                    <div className="flex items-center gap-6">
                        {isBroadcaster ? (
                            <div className="flex items-center gap-4">
                                <button onClick={() => handleSkip(-10)} className="hover:text-stranger-red transition-all duration-300 focus:outline-none transform hover:scale-110">
                                    <Rewind size={20} className="fill-current opacity-80" />
                                </button>
                                <button onClick={handlePlayPause} className="hover:text-stranger-red transition-all duration-300 focus:outline-none transform hover:scale-110">
                                    {isPlaying ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current" />}
                                </button>
                                <button onClick={() => handleSkip(10)} className="hover:text-stranger-red transition-all duration-300 focus:outline-none transform hover:scale-110">
                                    <FastForward size={20} className="fill-current opacity-80" />
                                </button>
                            </div>
                        ) : (
                            <div className="text-[10px] font-orbitron tracking-[0.2em] text-stranger-red px-3 py-1 border border-stranger-red/30 bg-stranger-red/5">
                                {playingState === 'playing' ? 'FEED: ACTIVE' : 'FEED: STALLED'}
                            </div>
                        )}
                        
                        <div className="text-xs font-mono flex items-center gap-2 text-gray-400">
                            <span className="text-white">{formatTime(currentTime)}</span>
                            <span className="opacity-30">|</span>
                            <span>{formatTime(duration)}</span>
                        </div>

                        <div className="flex items-center gap-3 group/volume relative ml-2">
                            <button onClick={toggleMute} className="hover:text-stranger-red transition-all duration-300 focus:outline-none">
                                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-0 overflow-hidden transform origin-left group-hover/volume:w-24 transition-all duration-500 accent-stranger-red"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="hover:text-stranger-red transition-colors focus:outline-none opacity-40 cursor-not-allowed transform hover:scale-110">
                            <Settings size={22} />
                        </button>
                        <button onClick={toggleFullScreen} className="hover:text-stranger-red transition-all duration-300 focus:outline-none transform hover:scale-110">
                            <Maximize size={22} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Retro HUD elements */}
            <div className="absolute top-4 left-4 pointer-events-none opacity-40 flex flex-col gap-1 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-stranger-red animate-pulse"></div>
                    <span className="text-[8px] font-orbitron tracking-widest text-stranger-red">LIVE SIGNAL</span>
                </div>
                <span className="text-[8px] font-mono text-gray-500">REC: 00:00:00:00</span>
            </div>

            <div className="absolute top-4 right-4 pointer-events-none opacity-40 z-10">
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">{isBroadcaster ? 'Admin Terminal 01' : 'Receiver Unit 04'}</span>
            </div>

            {/* Retro Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.07] z-30">
                <div className="w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>
            </div>
        </div>
    );
};

export default VideoPlayer;
