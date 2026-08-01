import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

/**
 * Scalable Video.js Player for HLS/CDN content.
 * Supports Adaptive Bitrate (ABR) and real-time synchronization pulses.
 */
const VideoJSPlayer = ({ 
    options, 
    onReady, 
    isBroadcaster, 
    isPlaying, 
    currentTimestamp, 
    onTimeUpdate, 
    onDurationChange 
}) => {
    const videoRef = useRef(null);
    const playerRef = useRef(null);

    useEffect(() => {
        // Initializing Video.js player
        if (!playerRef.current) {
            const videoElement = document.createElement("video-js");
            videoElement.classList.add('vjs-big-play-centered');
            videoElement.classList.add('vjs-custom-theme');
            videoRef.current.appendChild(videoElement);

            const player = playerRef.current = videojs(videoElement, {
                ...options,
                autoplay: isPlaying,
                controls: isBroadcaster, // Only host has the real controls
                responsive: true,
                fluid: true,
                liveui: true,
                playbackRates: [0.5, 1, 1.5, 2],
            }, () => {
                videojs.log('Player specialized and ready');
                onReady && onReady(player);
            });

            // Metadata listeners
            player.on('durationchange', () => onDurationChange(player.duration()));
            player.on('timeupdate', () => {
                if (isBroadcaster) onTimeUpdate(player.currentTime());
            });

        } else {
            const player = playerRef.current;
            player.autoplay(options.autoplay);
            player.src(options.sources);
        }
    }, [options, videoRef, isBroadcaster]);

    // Authoritative Sync Hook
    useEffect(() => {
        const player = playerRef.current;
        if (!player || isBroadcaster) return;

        // Adaptive Drift Correction
        const drift = Math.abs(player.currentTime() - currentTimestamp);
        if (drift > 0.5) {
            player.currentTime(currentTimestamp);
        }

        if (isPlaying && player.paused()) {
            player.play().catch(e => console.warn("Auto-play blocked by protocol", e));
        } else if (!isPlaying && !player.paused()) {
            player.pause();
        }
    }, [currentTimestamp, isPlaying, isBroadcaster]);

    // Cleanup on unmount
    useEffect(() => {
        const player = playerRef.current;
        return () => {
            if (player && !player.isDisposed()) {
                player.dispose();
                playerRef.current = null;
            }
        };
    }, [playerRef]);

    return (
        <div data-vjs-player className="w-full h-full glass-overlay overflow-hidden rounded-lg group">
            <div ref={videoRef} className="w-full h-full" />
            
            {/* Minimal HUD overlay for Video.js */}
            <style dangerouslySetInnerHTML={{ __html: `
                .vjs-custom-theme .vjs-control-bar {
                    background: rgba(0,0,0,0.8) !important;
                    backdrop-filter: blur(10px);
                    border-top: 1px solid rgba(0, 86, 179, 0.3);
                }
                .video-js .vjs-play-progress,
                .video-js .vjs-volume-level,
                .video-js .vjs-slider-bar {
                    background-color: #0056b3 !important;
                }
                .vjs-custom-theme .vjs-load-progress { background: rgba(255,255,255,0.05); }
                .vjs-big-play-centered .vjs-big-play-button {
                    background-color: rgba(0, 86, 179, 0.9);
                    border: none;
                    border-radius: 50%;
                    width: 80px;
                    height: 80px;
                    line-height: 80px;
                }
            `}} />
        </div>
    );
}

export default VideoJSPlayer;
