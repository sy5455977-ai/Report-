import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, RefreshCw, AlertCircle, Volume2, Phone, Video, Glasses, Sparkles, ChevronLeft, ChevronRight, Globe, Monitor, Radio, FlipHorizontal, Upload, Square, Eye, Lock, ArrowLeftRight } from 'lucide-react';

interface BellVideoScreenProps {
  isAiSpeaking: boolean;
  isRecording: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  networkStatus: 'stable' | 'reconnecting' | 'offline' | 'connecting' | null;
  voiceTranscription: string;
  error: string | null;
  theme: 'dark' | 'light';
  personality: 'bell' | 'black';
  onToggleMic: () => void;
  onDisconnect: () => void;
  onSelectPersonality: (p: 'bell' | 'black') => void;
  onCallModeChange?: (mode: 'incoming' | 'voice' | 'video') => void;
  isWebActive: boolean;
  onToggleWeb: () => void;
  isVisionActive?: boolean;
  visionMode?: 'screen' | 'camera' | null;
  visionStream?: MediaStream | null;
  onToggleVision?: () => void;
  onSwitchCameraFacing?: () => void;
  onUploadScreenshot?: (file: File) => void;
  facingMode?: 'user' | 'environment';
}

interface VideoClipItem {
  id: string;
  type: 'talking' | 'sunna';
  personality: 'bell' | 'black';
  url: string;
  name: string;
  createdAt: number;
}

export function BellVideoScreen({
  isAiSpeaking,
  isRecording,
  isConnected,
  isConnecting,
  networkStatus,
  voiceTranscription,
  error,
  theme,
  personality,
  onToggleMic,
  onDisconnect,
  onSelectPersonality,
  onCallModeChange,
  isWebActive,
  onToggleWeb,
  isVisionActive = false,
  visionMode = null,
  visionStream = null,
  onToggleVision,
  onSwitchCameraFacing,
  onUploadScreenshot,
  facingMode = 'user',
}: BellVideoScreenProps) {
  // Call mode state: 'incoming' (idle ring/slider) | 'voice' (audio-only) | 'video' (video AI + audio)
  const [callMode, setCallMode] = useState<'incoming' | 'voice' | 'video'>('incoming');

  // PiP swap state: false = AI in main screen & User in PiP; true = User in main screen & AI in PiP
  const [isSwapped, setIsSwapped] = useState<boolean>(false);

  // Video stream references for both Main and PiP camera streams
  const mainUserVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipUserVideoRef = useRef<HTMLVideoElement | null>(null);

  // Auto-attach media stream to active video element(s)
  useEffect(() => {
    if (visionStream) {
      if (mainUserVideoRef.current) {
        mainUserVideoRef.current.srcObject = visionStream;
        mainUserVideoRef.current.play().catch(e => console.warn("Main vision autoplay:", e));
      }
      if (pipUserVideoRef.current) {
        pipUserVideoRef.current.srcObject = visionStream;
        pipUserVideoRef.current.play().catch(e => console.warn("PiP vision autoplay:", e));
      }
    } else {
      if (mainUserVideoRef.current) mainUserVideoRef.current.srcObject = null;
      if (pipUserVideoRef.current) pipUserVideoRef.current.srcObject = null;
    }
  }, [visionStream, isVisionActive, isSwapped, callMode]);

  // Auto-start camera vision when user answers in video mode
  useEffect(() => {
    if (callMode === 'video' && !isVisionActive && onToggleVision) {
      onToggleVision();
    }
  }, [callMode]);

  // Slider drag gesture states
  const [dragX, setDragX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const currentDragXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const screenSwipeStartXRef = useRef<number | null>(null);
  const prevConnectingOrConnectedRef = useRef<boolean>(false);

  // Synchronize callMode with connection status safely: only reset to incoming when transitioning from active -> inactive
  useEffect(() => {
    const isCurrentlyActive = isConnected || isConnecting;
    if (prevConnectingOrConnectedRef.current && !isCurrentlyActive) {
      setCallMode('incoming');
      setIsSwapped(false);
      setDragX(0);
      currentDragXRef.current = 0;
      setIsDragging(false);
      isDraggingRef.current = false;
    }
    prevConnectingOrConnectedRef.current = isCurrentlyActive;
  }, [isConnected, isConnecting]);

  // Notify parent of callMode changes so global headers can be hidden during video calls
  useEffect(() => {
    onCallModeChange?.(callMode);
  }, [callMode, onCallModeChange]);

  // Bell Video Lists - Pre-warmed with default assets so video starts instantly without waiting for fetch
  const [bellTalkingClips, setBellTalkingClips] = useState<VideoClipItem[]>([
    {
      id: 'default_bell_talking',
      type: 'talking',
      personality: 'bell',
      url: '/videos/talking.mp4',
      name: 'Default Bell Talking',
      createdAt: Date.now()
    }
  ]);
  const [bellSunnaClips, setBellSunnaClips] = useState<VideoClipItem[]>([
    {
      id: 'default_bell_sunna',
      type: 'sunna',
      personality: 'bell',
      url: '/videos/sunna.mp4',
      name: 'Default Bell Sunna',
      createdAt: Date.now()
    }
  ]);

  // Black Video Lists - Pre-warmed with default assets so video starts instantly without waiting for fetch
  const [blackTalkingClips, setBlackTalkingClips] = useState<VideoClipItem[]>([
    {
      id: 'default_black_talking',
      type: 'talking',
      personality: 'black',
      url: '/videos/black_talking.mp4',
      name: 'Default Black Talking',
      createdAt: Date.now()
    }
  ]);
  const [blackSunnaClips, setBlackSunnaClips] = useState<VideoClipItem[]>([
    {
      id: 'default_black_sunna',
      type: 'sunna',
      personality: 'black',
      url: '/videos/black_sunna.mp4',
      name: 'Default Black Sunna',
      createdAt: Date.now()
    }
  ]);

  // Active indices for smooth round-robin playback
  const [currentTalkingIndex, setCurrentTalkingIndex] = useState<number>(0);
  const [currentSunnaIndex, setCurrentSunnaIndex] = useState<number>(0);

  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);

  // References for pre-mounted video elements
  const talkingVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const sunnaVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Computed active clips based on current personality
  const activeTalkingClips = personality === 'black' ? blackTalkingClips : bellTalkingClips;
  const activeSunnaClips = personality === 'black' ? blackSunnaClips : bellSunnaClips;

  // Load clips from server ONLY when in video mode
  useEffect(() => {
    if (callMode !== 'video') return;

    let isMounted = true;

    const loadClipsFromServer = async () => {
      const loadedBellTalking: VideoClipItem[] = [];
      const loadedBellSunna: VideoClipItem[] = [];
      const loadedBlackTalking: VideoClipItem[] = [];
      const loadedBlackSunna: VideoClipItem[] = [];

      try {
        const res = await fetch(`/api/bell-video/status?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();

          if (Array.isArray(data.talkingUrls) && data.talkingUrls.length > 0) {
            data.talkingUrls.forEach((u: string, idx: number) => {
              loadedBellTalking.push({
                id: `server_bell_talking_${idx}`,
                type: 'talking',
                personality: 'bell',
                url: `${u}?t=${Date.now()}`,
                name: `Bell Talking Clip #${idx + 1}`,
                createdAt: Date.now() + idx
              });
            });
          }

          if (Array.isArray(data.sunnaUrls) && data.sunnaUrls.length > 0) {
            data.sunnaUrls.forEach((u: string, idx: number) => {
              loadedBellSunna.push({
                id: `server_bell_sunna_${idx}`,
                type: 'sunna',
                personality: 'bell',
                url: `${u}?t=${Date.now()}`,
                name: `Bell Sunna Clip #${idx + 1}`,
                createdAt: Date.now() + idx
              });
            });
          }

          if (Array.isArray(data.blackTalkingUrls) && data.blackTalkingUrls.length > 0) {
            data.blackTalkingUrls.forEach((u: string, idx: number) => {
              loadedBlackTalking.push({
                id: `server_black_talking_${idx}`,
                type: 'talking',
                personality: 'black',
                url: `${u}?t=${Date.now()}`,
                name: `Black Talking Clip #${idx + 1}`,
                createdAt: Date.now() + idx
              });
            });
          }

          if (Array.isArray(data.blackSunnaUrls) && data.blackSunnaUrls.length > 0) {
            data.blackSunnaUrls.forEach((u: string, idx: number) => {
              loadedBlackSunna.push({
                id: `server_black_sunna_${idx}`,
                type: 'sunna',
                personality: 'black',
                url: `${u}?t=${Date.now()}`,
                name: `Black Sunna Clip #${idx + 1}`,
                createdAt: Date.now() + idx
              });
            });
          }
        }
      } catch (err) {
        console.warn("Error fetching server clips for BellVideoScreen:", err);
      }

      if (loadedBellTalking.length === 0) {
        loadedBellTalking.push({
          id: 'default_bell_talking',
          type: 'talking',
          personality: 'bell',
          url: '/videos/talking.mp4',
          name: 'Default Bell Talking',
          createdAt: Date.now()
        });
      }

      if (loadedBellSunna.length === 0) {
        loadedBellSunna.push({
          id: 'default_bell_sunna',
          type: 'sunna',
          personality: 'bell',
          url: '/videos/sunna.mp4',
          name: 'Default Bell Sunna',
          createdAt: Date.now()
        });
      }

      if (loadedBlackTalking.length === 0) {
        loadedBlackTalking.push({
          id: 'default_black_talking',
          type: 'talking',
          personality: 'black',
          url: '/videos/black_talking.mp4',
          name: 'Default Black Talking',
          createdAt: Date.now()
        });
      }

      if (loadedBlackSunna.length === 0) {
        loadedBlackSunna.push({
          id: 'default_black_sunna',
          type: 'sunna',
          personality: 'black',
          url: '/videos/black_sunna.mp4',
          name: 'Default Black Sunna',
          createdAt: Date.now()
        });
      }

      if (isMounted) {
        setBellTalkingClips(loadedBellTalking);
        setBellSunnaClips(loadedBellSunna);
        setBlackTalkingClips(loadedBlackTalking);
        setBlackSunnaClips(loadedBlackSunna);
      }
    };

    loadClipsFromServer();

    return () => {
      isMounted = false;
    };
  }, [callMode]);

  // Safe play helper preventing unhandled promise rejections
  const safePlayVideo = (videoEl: HTMLVideoElement | null) => {
    if (!videoEl || callMode !== 'video') return;
    videoEl.muted = true;
    videoEl.playsInline = true;
    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  };

  // Reset indices and pre-warm on personality switch ONLY in video mode
  useEffect(() => {
    if (callMode !== 'video') return;
    setCurrentTalkingIndex(0);
    setCurrentSunnaIndex(0);
    setTimeout(() => {
      const curSunna = sunnaVideoRefs.current[0];
      if (curSunna) safePlayVideo(curSunna);
    }, 50);
  }, [personality, callMode]);

  // Playback synchronizer: Only active when callMode is 'video'
  useEffect(() => {
    if (callMode !== 'video') return;

    if (isAiSpeaking) {
      const activeTalkingEl = talkingVideoRefs.current[currentTalkingIndex];
      safePlayVideo(activeTalkingEl);

      if (activeTalkingClips.length > 1) {
        const nextIdx = (currentTalkingIndex + 1) % activeTalkingClips.length;
        const nextEl = talkingVideoRefs.current[nextIdx];
        if (nextEl && nextEl.paused) {
          nextEl.currentTime = 0;
          safePlayVideo(nextEl);
        }
      }
    } else {
      const activeSunnaEl = sunnaVideoRefs.current[currentSunnaIndex];
      safePlayVideo(activeSunnaEl);

      if (activeSunnaClips.length > 1) {
        const nextIdx = (currentSunnaIndex + 1) % activeSunnaClips.length;
        const nextEl = sunnaVideoRefs.current[nextIdx];
        if (nextEl && nextEl.paused) {
          nextEl.currentTime = 0;
          safePlayVideo(nextEl);
        }
      }
    }
  }, [isAiSpeaking, currentTalkingIndex, currentSunnaIndex, activeTalkingClips.length, activeSunnaClips.length, personality, callMode]);

  // Seamless Next Video Handlers: Zero black screen crossfade
  const handleTalkingVideoEnded = (endedIdx: number) => {
    if (callMode !== 'video') return;
    if (activeTalkingClips.length <= 1) {
      const el = talkingVideoRefs.current[0];
      if (el) {
        el.currentTime = 0;
        safePlayVideo(el);
      }
      return;
    }

    const nextIdx = (endedIdx + 1) % activeTalkingClips.length;
    const nextEl = talkingVideoRefs.current[nextIdx];
    if (nextEl) {
      nextEl.currentTime = 0;
      safePlayVideo(nextEl);
    }
    setCurrentTalkingIndex(nextIdx);
  };

  const handleSunnaVideoEnded = (endedIdx: number) => {
    if (callMode !== 'video') return;
    if (activeSunnaClips.length <= 1) {
      const el = sunnaVideoRefs.current[0];
      if (el) {
        el.currentTime = 0;
        safePlayVideo(el);
      }
      return;
    }

    const nextIdx = (endedIdx + 1) % activeSunnaClips.length;
    const nextEl = sunnaVideoRefs.current[nextIdx];
    if (nextEl) {
      nextEl.currentTime = 0;
      safePlayVideo(nextEl);
    }
    setCurrentSunnaIndex(nextIdx);
  };

  // Answering action handler
  const handleAnswerCall = (mode: 'voice' | 'video') => {
    setCallMode(mode);
    setIsSwapped(false);
    setDragX(0);
    currentDragXRef.current = 0;
    setIsDragging(false);
    isDraggingRef.current = false;

    // Immediately trigger connection if not already connected
    if (!isConnected && !isConnecting) {
      onToggleMic();
    }
  };

  // Disconnect handler
  const handleEndCall = () => {
    onDisconnect();
    setCallMode('incoming');
    setIsSwapped(false);
    setDragX(0);
    currentDragXRef.current = 0;
    setIsDragging(false);
    isDraggingRef.current = false;
  };

  // Slider Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
    dragStartXRef.current = e.clientX;
    currentDragXRef.current = 0;
    setIsDragging(true);
    isDraggingRef.current = true;
    setDragX(0);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const maxOffset = 100;
    const diff = e.clientX - dragStartXRef.current;
    const clamped = Math.max(-maxOffset, Math.min(maxOffset, diff));
    currentDragXRef.current = clamped;
    setDragX(clamped);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}

    const finalX = currentDragXRef.current;
    setIsDragging(false);
    isDraggingRef.current = false;

    const threshold = 35;
    if (finalX >= threshold) {
      handleAnswerCall('voice');
    } else if (finalX <= -threshold) {
      handleAnswerCall('video');
    } else {
      setDragX(0);
      currentDragXRef.current = 0;
    }
  };

  // Full-Screen Swipe Support for Android Mobile
  const handleScreenTouchStart = (e: React.TouchEvent) => {
    if (callMode === 'incoming') {
      screenSwipeStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleScreenTouchEnd = (e: React.TouchEvent) => {
    if (callMode === 'incoming' && screenSwipeStartXRef.current !== null) {
      const deltaX = e.changedTouches[0].clientX - screenSwipeStartXRef.current;
      screenSwipeStartXRef.current = null;
      const screenThreshold = 50;
      if (deltaX >= screenThreshold) {
        handleAnswerCall('voice');
      } else if (deltaX <= -screenThreshold) {
        handleAnswerCall('video');
      }
    }
  };

  const isBlack = personality === 'black';

  return (
    <div
      id="bell-video-container"
      onTouchStart={handleScreenTouchStart}
      onTouchEnd={handleScreenTouchEnd}
      className={`relative w-full ${
        callMode === 'video' ? 'h-full md:h-full' : 'h-[calc(100vh-65px)] md:h-[calc(100vh-73px)]'
      } bg-black overflow-hidden flex flex-col justify-between select-none font-sans`}
    >
      {/* 
        =======================================================================
        VIDEO CALL STACKS WITH NATURAL PIP (PICTURE-IN-PICTURE) & INSTANT SWAP
        Photo 2 Style: Clean, rounded PiP in bottom-right corner.
        Tap small PiP -> becomes big main screen.
        Tap main screen -> swaps smoothly back and forth.
        =======================================================================
      */}

      {callMode === 'video' && (
        <>
          {/* 1. BLACKBELL AI VIDEO STACK CONTAINER (Full Screen when !isSwapped, PiP when isSwapped) */}
          <div
            onClick={(e) => {
              if (isSwapped) {
                e.stopPropagation();
                setIsSwapped(false);
              } else {
                // Tapping main screen swaps screens
                setIsSwapped(true);
              }
            }}
            className={`transition-all duration-300 ease-in-out cursor-pointer ${
              !isSwapped
                ? 'absolute inset-0 w-full h-full z-0'
                : 'absolute bottom-28 right-4 z-30 w-28 sm:w-36 h-40 sm:h-52 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-zinc-950 hover:scale-105 active:scale-95 group'
            }`}
          >
            {/* AI Idle / Listening Clips */}
            <div className="absolute inset-0 w-full h-full pointer-events-none">
              {activeSunnaClips.map((clip, idx) => {
                const isActive = !isAiSpeaking && currentSunnaIndex === idx;
                return (
                  <video
                    key={`sunna-player-${personality}-${clip.id}`}
                    id={`bell-video-sunna-${idx}`}
                    ref={(el) => { sunnaVideoRefs.current[idx] = el; }}
                    src={clip.url}
                    playsInline
                    muted
                    autoPlay
                    preload="auto"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('talking.mp4') && !target.src.includes('sunna.mp4')) {
                        target.src = isBlack ? '/videos/black_sunna.mp4' : '/videos/sunna.mp4';
                      }
                    }}
                    onEnded={() => handleSunnaVideoEnded(idx)}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-in-out ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                );
              })}
            </div>

            {/* AI Speaking Clips */}
            <div className="absolute inset-0 w-full h-full pointer-events-none">
              {activeTalkingClips.map((clip, idx) => {
                const isActive = isAiSpeaking && currentTalkingIndex === idx;
                return (
                  <video
                    key={`talking-player-${personality}-${clip.id}`}
                    id={`bell-video-talking-${idx}`}
                    ref={(el) => { talkingVideoRefs.current[idx] = el; }}
                    src={clip.url}
                    playsInline
                    muted
                    autoPlay
                    preload="auto"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('talking.mp4') && !target.src.includes('sunna.mp4')) {
                        target.src = isBlack ? '/videos/black_talking.mp4' : '/videos/talking.mp4';
                      }
                    }}
                    onEnded={() => handleTalkingVideoEnded(idx)}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-in-out ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                );
              })}
            </div>

            {/* PiP Overlay Tag when AI is in the small box */}
            {isSwapped && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-md text-white border ${
                  isBlack ? 'bg-amber-950/70 border-amber-500/40 text-amber-300' : 'bg-pink-950/70 border-pink-500/40 text-pink-300'
                }`}>
                  {isBlack ? 'Black AI' : 'Bell AI'}
                </span>
                <div className="p-1 rounded-full bg-black/60 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowLeftRight className="w-3 h-3" />
                </div>
              </div>
            )}
          </div>

          {/* 2. USER CAMERA FEED CONTAINER (PiP when !isSwapped, Full Screen when isSwapped) */}
          <div
            onClick={(e) => {
              if (!isSwapped) {
                e.stopPropagation();
                setIsSwapped(true);
              } else {
                // Tapping main screen swaps screens back
                setIsSwapped(false);
              }
            }}
            className={`transition-all duration-300 ease-in-out cursor-pointer ${
              isSwapped
                ? 'absolute inset-0 w-full h-full z-0'
                : 'absolute bottom-28 right-4 z-30 w-28 sm:w-36 h-40 sm:h-52 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-zinc-950 hover:scale-105 active:scale-95 group'
            }`}
          >
            {/* Live Camera Stream Video */}
            {isVisionActive && visionStream ? (
              <video
                ref={isSwapped ? mainUserVideoRef : pipUserVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
            ) : (
              /* Sleek fallback when camera is activating or muted */
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-black text-gray-400 p-3 text-center">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2">
                  <Video className="w-5 h-5 text-gray-300" />
                </div>
                <span className="text-[10px] font-bold text-gray-300">You</span>
                {!isVisionActive && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVision?.();
                    }}
                    className="mt-2 px-2 py-1 bg-white/15 hover:bg-white/25 rounded-md text-[9px] font-bold text-white transition-colors"
                  >
                    Start Cam
                  </button>
                )}
              </div>
            )}

            {/* Clean WhatsApp Style PiP Controls & Indicators (When User is in PiP) */}
            {!isSwapped && (
              <>
                {/* Top quick action: Flip camera */}
                {isVisionActive && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSwitchCameraFacing?.();
                    }}
                    title={`Switch Camera (${facingMode === 'user' ? 'Front' : 'Back'})`}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white/90 border border-white/10 transition-transform active:scale-90 cursor-pointer shadow-md"
                  >
                    <FlipHorizontal className="w-3 h-3" />
                  </button>
                )}

                {/* Bottom status badge */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white/90 border border-white/10">
                    You
                  </span>
                  {!isRecording && (
                    <span className="p-1 rounded-full bg-red-600/80 backdrop-blur-md text-white shadow-sm" title="Muted">
                      <MicOff className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Swap Hint Badge for Desktop & Mobile hover */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <div className="p-2 rounded-full bg-black/60 text-white backdrop-blur-md">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* WhatsApp-Style Minimal Clean Top Video Call Header */}
          <div className="absolute top-4 inset-x-0 z-20 flex items-center justify-between px-4 sm:px-6 pointer-events-none">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full shadow-lg pointer-events-auto">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] font-semibold text-gray-200">End-to-end encrypted</span>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={() => onSelectPersonality(isBlack ? 'bell' : 'black')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 rounded-full text-xs font-bold text-white transition-colors cursor-pointer shadow-lg"
              >
                <span className={isBlack ? 'text-amber-400' : 'text-pink-400'}>●</span>
                <span>{isBlack ? 'Black' : 'Bell'}</span>
              </button>

              <button
                type="button"
                onClick={onSwitchCameraFacing}
                title={`Switch Camera (${facingMode === 'user' ? 'Front' : 'Back'})`}
                className="p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 rounded-full text-white transition-colors cursor-pointer shadow-lg"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subtle Center Muted Pill if Microphone is Off (Like Photo 2) */}
          {!isRecording && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-black/65 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-2xl">
                <MicOff className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-white/90 drop-shadow-md">Muted</span>
            </div>
          )}
        </>
      )}

      {/* Dark Vignette overlays for high contrast readability */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-black/85 via-transparent to-black/60" />

      {/* TOP HEADER BAR - Hidden during video call to avoid blocking video */}
      {callMode !== 'video' && (
        <div className="relative z-20 flex items-center justify-between p-4 md:p-6">
          
          {/* Left: Personality Identity Tag & Live Status */}
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/15 px-3.5 py-2 rounded-2xl shadow-xl">
            <div className="relative flex items-center justify-center">
              <span className={`w-3 h-3 rounded-full ${isBlack ? 'bg-amber-400' : 'bg-pink-500'}`} />
              {isAiSpeaking && (
                <span className={`absolute w-5 h-5 rounded-full ${isBlack ? 'bg-amber-300' : 'bg-pink-400'} animate-ping opacity-60`} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white tracking-wider">
                  {isBlack ? 'Black' : 'Bell'}
                </span>
                <span className={`text-[9px] px-1.5 py-0.2 font-mono font-bold rounded border ${
                  callMode === 'voice'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : isBlack
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                }`}>
                  {callMode === 'voice' ? 'VOICE AI' : callMode === 'video' ? 'VIDEO AI' : 'AGI'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium">
                {callMode === 'incoming' ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Ready to connect
                  </span>
                ) : isAiSpeaking ? (
                  <span className={`${isBlack ? 'text-amber-300' : 'text-pink-300'} font-bold flex items-center gap-1`}>
                    <Volume2 className="w-3 h-3 inline animate-pulse" /> Speaking
                  </span>
                ) : isRecording ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    Listening
                  </span>
                ) : (
                  <span className="text-gray-400">
                    Idle
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Personality Switcher */}
          <div className="flex flex-col gap-1.5 p-1 rounded-2xl bg-black/70 border border-white/15 backdrop-blur-md shadow-lg">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => onSelectPersonality('black')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  personality === 'black'
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-amber-400">●</span>
                <span>Black</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectPersonality('bell')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  personality === 'bell'
                    ? 'bg-gradient-to-r from-pink-600 to-rose-500 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-pink-300">●</span>
                <span>Bell</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onToggleWeb}
              className={`w-full py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                isWebActive
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40 animate-pulse'
                  : 'bg-zinc-800/40 text-gray-400 border-zinc-700 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Globe className={`w-3.5 h-3.5 ${isWebActive ? 'text-emerald-200 animate-spin' : 'text-gray-400'}`} style={{ animationDuration: isWebActive ? '3s' : '0s' }} />
              <span>Web</span>
            </button>
            <button
              type="button"
              onClick={onToggleVision}
              title={isVisionActive ? "Stop Screen/Vision Sharing" : "Start Live Screen / Vision"}
              className={`w-full py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                isVisionActive
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-500 shadow-md shadow-red-950/40 animate-pulse'
                  : 'bg-zinc-800/40 text-gray-400 border-zinc-700 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              {isVisionActive ? (
                <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
              ) : (
                <Monitor className="w-3.5 h-3.5 text-gray-400" />
              )}
              <span>{isVisionActive ? (visionMode === 'camera' ? 'Camera Live' : 'Screen Live') : 'Screen / Vision'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="relative z-20 mx-4 self-center max-w-md bg-red-950/90 backdrop-blur-md border border-red-500/40 text-red-200 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 shadow-2xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* MAIN CONTENT AREA: INCOMING CALL SCREEN vs ACTIVE CALL SCREENS */}
      {callMode === 'incoming' ? (
        /* INCOMING CALL SCREEN WITH SMOOTH SWIPE GESTURE SELECTION */
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 w-full max-w-md mx-auto my-auto gap-6 animate-fade-in">
          
          {/* Avatar Ring Section */}
          <div className="flex flex-col items-center gap-4">
            <div className={`relative w-48 h-48 md:w-56 md:h-56 rounded-full flex items-center justify-center border transition-all duration-300 ${
              isBlack
                ? 'border-amber-500/25 bg-amber-500/5 shadow-[0_0_60px_rgba(245,158,11,0.15)]'
                : 'border-pink-500/25 bg-pink-500/5 shadow-[0_0_60px_rgba(236,72,153,0.15)]'
            }`}>
              <div className="w-36 h-36 md:w-40 md:h-40 rounded-full border border-white/10 bg-zinc-950/90 flex flex-col items-center justify-center shadow-inner">
                {isBlack ? (
                  <>
                    <Glasses className="w-12 h-12 text-amber-400 mb-1" />
                    <span className="text-[10px] font-mono font-black tracking-widest text-amber-400 uppercase">
                      BLACK MALE AI
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-12 h-12 text-pink-400 mb-1" />
                    <span className="text-[10px] font-mono font-black tracking-widest text-pink-400 uppercase">
                      BELL FEMALE AI
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Title & Connection Status Pill */}
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-wider uppercase font-sans">
                {isBlack ? 'BLACK AI' : 'BELL AI'}
              </h1>
              <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-900/90 border border-white/15 text-xs font-semibold text-gray-200 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Incoming Connection</span>
              </div>
            </div>
          </div>

          {/* Draggable Swipe Slider Bar */}
          <div className="w-full max-w-xs flex flex-col items-center gap-2.5 mt-2">
            <div
              className={`w-full relative h-16 rounded-full bg-zinc-900/95 border transition-colors duration-200 flex items-center justify-between px-5 select-none touch-none shadow-2xl overflow-hidden cursor-pointer ${
                dragX > 20
                  ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
                  : dragX < -20
                    ? 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.25)]'
                    : 'border-white/15'
              }`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onLostPointerCapture={handlePointerEnd}
            >
              <div
                className="absolute inset-y-0 transition-opacity duration-150 pointer-events-none"
                style={{
                  left: dragX < 0 ? `${50 + (dragX / 100) * 50}%` : '50%',
                  right: dragX > 0 ? `${50 - (dragX / 100) * 50}%` : '50%',
                  backgroundColor: dragX > 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(59, 130, 246, 0.25)',
                  opacity: Math.min(1, Math.abs(dragX) / 30)
                }}
              />

              {/* Left Label: Video AI */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleAnswerCall('video');
                }}
                className={`flex items-center gap-1 text-[11px] font-black tracking-wider transition-all z-10 cursor-pointer ${
                  dragX < -20 ? 'text-blue-400 scale-105' : 'text-gray-400 hover:text-blue-300'
                }`}
              >
                <ChevronLeft className="w-4 h-4 animate-pulse text-blue-400" />
                <span>VIDEO</span>
              </div>

              {/* Center Draggable Knob */}
              <div
                style={{
                  transform: `translate3d(${dragX}px, 0, 0)`,
                  transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                }}
                className={`absolute left-1/2 top-1/2 -ml-6 -mt-6 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl cursor-grab active:cursor-grabbing border-2 z-20 select-none ${
                  dragX > 25
                    ? 'bg-emerald-500 text-white border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.8)] scale-105'
                    : dragX < -25
                      ? 'bg-blue-500 text-white border-blue-300 shadow-[0_0_25px_rgba(59,130,246,0.8)] scale-105'
                      : 'bg-white text-zinc-950 border-white/60 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                }`}
              >
                {dragX < -25 ? (
                  <Video className="w-5 h-5 text-white" />
                ) : dragX > 25 ? (
                  <Phone className="w-5 h-5 text-white" />
                ) : (
                  <Phone className="w-5 h-5 text-zinc-950" />
                )}
              </div>

              {/* Right Label: Voice Only */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleAnswerCall('voice');
                }}
                className={`flex items-center gap-1 text-[11px] font-black tracking-wider transition-all z-10 cursor-pointer ${
                  dragX > 20 ? 'text-emerald-400 scale-105' : 'text-gray-400 hover:text-emerald-300'
                }`}
              >
                <span>VOICE</span>
                <ChevronRight className="w-4 h-4 animate-pulse text-emerald-400" />
              </div>
            </div>

            <p className="text-[11px] text-gray-400 font-medium tracking-wide text-center">
              Swipe right for Voice • Swipe left for Video
            </p>
          </div>
        </div>
      ) : callMode === 'voice' ? (
        /* VOICE MODEL ACTIVE SCREEN (AUDIO ONLY) */
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 gap-8 animate-fade-in">
          <div className="relative flex items-center justify-center">
            <div className={`w-52 h-52 rounded-full absolute transition-all duration-500 ${
              isAiSpeaking
                ? isBlack
                  ? 'border-2 border-amber-400/60 bg-amber-400/10 animate-ping opacity-50'
                  : 'border-2 border-pink-400/60 bg-pink-400/10 animate-ping opacity-50'
                : isRecording
                  ? 'border-2 border-emerald-400/40 bg-emerald-400/5 animate-pulse'
                  : 'border border-white/10'
            }`} />
            
            <div className={`w-44 h-44 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-2xl ${
              isAiSpeaking
                ? isBlack
                  ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_40px_rgba(245,158,11,0.35)]'
                  : 'border-pink-400 bg-pink-500/15 shadow-[0_0_40px_rgba(236,72,153,0.35)]'
                : isRecording
                  ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
                  : 'border-white/20 bg-zinc-900'
            }`}>
              <div className="w-32 h-32 rounded-full bg-zinc-950 border border-white/10 flex flex-col items-center justify-center">
                {isAiSpeaking ? (
                  <Volume2 className={`w-12 h-12 animate-pulse ${isBlack ? 'text-amber-400' : 'text-pink-400'}`} />
                ) : isRecording ? (
                  <Mic className="w-12 h-12 text-emerald-400 animate-bounce" />
                ) : (
                  <MicOff className="w-12 h-12 text-gray-500" />
                )}
              </div>
            </div>
          </div>

          <div className="text-center flex flex-col items-center gap-1.5">
            <h2 className="text-xl font-bold text-white tracking-wide">
              {isBlack ? 'Black Voice Assistant' : 'Bell Voice Assistant'}
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Voice Model Active • Audio Only</span>
            </div>
          </div>
        </div>
      ) : (
        /* In video mode, center space is kept open for video feeds and PiP */
        <div className="relative z-10 flex-1" />
      )}

      {/* SUBTITLES / TRANSCRIPT OVERLAY - Removed as per user request */}
      <div className="relative z-20 flex flex-col justify-end items-center px-4 pb-2 pointer-events-none max-h-36">
      </div>

      {/* BOTTOM FLOATING CALL CONTROLS (Active only during Voice or Video calls) */}
      {callMode !== 'incoming' && (
        <div className="relative z-40 flex items-center justify-center gap-5 sm:gap-6 p-4 md:pb-8">
          {/* End Call / Disconnect Button */}
          <button
            onClick={handleEndCall}
            title="End Call"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-[0_0_25px_rgba(220,38,38,0.5)] active:scale-95 border-2 border-red-400/40"
          >
            <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>

          {/* Quick Camera Facing Switcher (Photo 2 style video control) */}
          <button
            type="button"
            onClick={onSwitchCameraFacing}
            title={`Switch Camera (Currently ${facingMode === 'user' ? 'Front' : 'Back'})`}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-lg flex items-center justify-center text-white transition-all cursor-pointer shadow-xl active:scale-95 border border-white/20"
          >
            <FlipHorizontal className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Quick Screen / Vision Share Button */}
          <button
            type="button"
            onClick={onToggleVision}
            title={isVisionActive ? "Stop Camera / Vision" : "Start Camera / Vision"}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full backdrop-blur-lg flex items-center justify-center transition-all cursor-pointer shadow-xl active:scale-95 border ${
              isVisionActive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                : 'bg-white/10 hover:bg-white/20 text-gray-200 border-white/20'
            }`}
          >
            {isVisionActive ? (
              <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            ) : (
              <Video className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
            )}
          </button>

          {/* Mic Toggle Button */}
          <button
            onClick={onToggleMic}
            title={isRecording ? "Mute Microphone" : "Unmute Microphone"}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full backdrop-blur-lg flex items-center justify-center transition-all cursor-pointer shadow-xl active:scale-95 border ${
              isRecording
                ? 'bg-white/20 hover:bg-white/30 text-white border-white/30'
                : 'bg-red-500/30 hover:bg-red-500/40 text-red-300 border-red-500/40'
            }`}
          >
            {isConnecting ? (
              <RefreshCw className={`w-5 h-5 sm:w-6 sm:h-6 ${isBlack ? 'text-amber-400' : 'text-pink-400'} animate-spin`} />
            ) : isRecording ? (
              <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            ) : (
              <MicOff className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

