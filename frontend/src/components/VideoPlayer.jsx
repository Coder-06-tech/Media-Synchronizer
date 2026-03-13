import { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, FileVideo } from 'lucide-react';

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
    const containerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Sync remote state to local ref
    useEffect(() => {
        if (!videoRef.current || isBroadcaster) return;

        if (playingState === 'playing' && videoRef.current.paused) {
            videoRef.current.play().catch(e => console.warn('Autoplay prevented', e));
            setIsPlaying(true);
        } else if (playingState === 'paused' && !videoRef.current.paused) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [playingState, isBroadcaster]);

    useEffect(() => {
        if (!videoRef.current || isBroadcaster) return;
        
        // If drift is > 300ms, adjust
        const drift = Math.abs(videoRef.current.currentTime - currentTimestamp);
        if (drift > 0.3) {
            console.log(`Synchronizing drift... Local: ${videoRef.current.currentTime}, Remote: ${currentTimestamp}`);
            videoRef.current.currentTime = currentTimestamp;
        }
    }, [currentTimestamp, isBroadcaster]);

    // Attach remote stream for listeners
    useEffect(() => {
        if (!isBroadcaster && remoteStream && videoRef.current) {
            if (videoRef.current.srcObject !== remoteStream) {
                videoRef.current.srcObject = remoteStream;
            }
        }
    }, [isBroadcaster, remoteStream]);

    // Local event handlers (Broadcaster only)
    const handlePlayPause = () => {
        if (!isBroadcaster || !videoRef.current) return;
        
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
            onPlay(videoRef.current.currentTime);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
            onPause(videoRef.current.currentTime);
        }
    };

    const handleSeek = (e) => {
        if (!isBroadcaster || !videoRef.current) return;
        const time = (e.nativeEvent.offsetX / e.currentTarget.offsetWidth) * videoRef.current.duration;
        videoRef.current.currentTime = time;
        setCurrentTime(time);
        onSeek(time);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleVolumeChange = (e) => {
        const value = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.volume = value;
            setVolume(value);
            setIsMuted(value === 0);
        }
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
        <div ref={containerRef} className="relative group bg-black border-2 border-stranger-red overflow-hidden neon-border">
            {!videoUrl && !remoteStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
                    <FileVideo size={64} className="text-gray-600 mb-4" />
                    <p className="text-gray-400 uppercase tracking-widest animate-pulse">Awaiting Signal Feed...</p>
                    {isBroadcaster && <p className="text-xs text-stranger-red mt-2">Initialize Local Media to Broadcast</p>}
                </div>
            )}
            
            <video 
                ref={videoRef}
                src={isBroadcaster && videoUrl ? videoUrl : undefined}
                className="w-full aspect-video object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => { if(isBroadcaster) { setIsPlaying(true); onPlay(videoRef.current.currentTime); } }}
                onPause={() => { if(isBroadcaster) { setIsPlaying(false); onPause(videoRef.current.currentTime); } }}
                autoPlay={!isBroadcaster} // Listeners auto play the incoming stream
            />

            {/* Custom Controls UI */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                {/* Progress Bar (Broadcaster only or visual for listeners) */}
                <div 
                    className={`w-full h-1 bg-gray-700 mb-4 cursor-pointer relative ${!isBroadcaster && 'pointer-events-none'}`}
                    onClick={handleSeek}
                >
                    <div 
                        className="h-full bg-stranger-red"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                    <div 
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full transition-transform scale-0 group-hover:scale-100"
                        style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
                    />
                </div>

                <div className="flex justify-between items-center text-white">
                    <div className="flex items-center gap-4">
                        {isBroadcaster ? (
                            <button onClick={handlePlayPause} className="hover:text-stranger-red transition-colors focus:outline-none">
                                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                            </button>
                        ) : (
                            <div className="text-xs uppercase tracking-widest text-stranger-red px-2 border border-stranger-red">
                                {playingState === 'playing' ? 'SYNCED PLAY' : 'PAUSED'}
                            </div>
                        )}
                        
                        {isBroadcaster && (
                            <div className="text-sm font-mono flex items-center gap-1 opacity-70">
                                <span>{formatTime(currentTime)}</span>
                                <span>/</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        )}

                        <div className="flex items-center gap-2 group/volume relative">
                            <button onClick={toggleMute} className="hover:text-stranger-red transition-colors focus:outline-none">
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-0 overflow-hidden transform origin-left group-hover/volume:w-20 transition-all duration-300 accent-stranger-red"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="hover:text-stranger-red transition-colors focus:outline-none opacity-50 cursor-not-allowed" title="Settings">
                            <Settings size={20} />
                        </button>
                        <button onClick={toggleFullScreen} className="hover:text-stranger-red transition-colors focus:outline-none">
                            <Maximize size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Retro Scanline Overlay on Player */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPHJlY3Qgd2lkdGg9IjQiIGhlaWdodD0iMiIgZmlsbD0iIzAwMCIgZmlsbC1vcGFjaXR5PSIwLjEiLz4KPC9zdmc+')]"></div>
            </div>
        </div>
    );
};

export default VideoPlayer;
