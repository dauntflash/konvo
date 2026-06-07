import React, { FC, useState, useRef, useEffect } from "react";

interface SingleAudioPlayerProps {
  url: string;
  fileName?: string;
}

const AudioPlayer: FC<SingleAudioPlayerProps> = ({ url, fileName }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100;
    setVolume(newVolume);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col w-[320px] bg-black bg-opacity-60 backdrop-blur-md rounded-lg shadow-lg p-3">
      <audio ref={audioRef} src={url} preload="metadata" />
      
      {fileName && (
        <div className="text-sm text-gray-100 font-medium mb-2.5 px-1 truncate">
          {fileName}
        </div>
      )}
      
      <div className="mb-2">
        <div
          className="relative w-full h-1 bg-[#2d3847] rounded-full cursor-pointer group"
          onClick={(e) => {
            if (!duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = e.clientX - rect.left;
            const newTime = (clickPos / rect.width) * duration;
            seek(newTime);
          }}
        >
          <div
            className="absolute top-0 left-0 h-1 bg-[#5b8def] rounded-full transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#5b8def] rounded-full shadow-md transition-all duration-150"
            style={{ left: `${progress}%`, marginLeft: '-5px' }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <button className="text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
              <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/>
              <path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>
            </svg>
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={volume * 100}
            onChange={handleVolumeChange}
            className="w-12 h-1 accent-[#5b8def] bg-[#2d3847] rounded-full cursor-pointer"
          />
        </div>

        <button 
          onClick={() => seek(Math.max(0, currentTime - 10))}
          className="text-gray-400 hover:text-white transition-colors flex flex-col items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/>
          </svg>
          <span className="text-[9px] mt-0.5">10</span>
        </button>

        <button
          onClick={togglePlayPause}
          className="p-2 bg-[#5b8def] rounded-full hover:bg-[#4a7ad6] transition-all duration-200 flex-shrink-0"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="white">
              <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="white">
              <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
            </svg>
          )}
        </button>

        <button 
          onClick={() => seek(Math.min(duration, currentTime + 10))}
          className="text-gray-400 hover:text-white transition-colors flex flex-col items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
          <span className="text-[9px] mt-0.5">10</span>
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a.5.5 0 0 1 .5.5V4a.5.5 0 0 1-1 0V2.5A.5.5 0 0 1 8 2zM3.732 3.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707zM2 8a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 8zm9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5zm.754-4.246a.389.389 0 0 0-.527-.02L7.547 7.31A.91.91 0 1 0 8.85 8.569l3.434-4.297a.389.389 0 0 0-.029-.518z"/>
              <path fillRule="evenodd" d="M6.664 15.889A8 8 0 1 1 9.336.11a8 8 0 0 1-2.672 15.78zm-4.665-4.283A11.945 11.945 0 0 1 8 10c2.186 0 4.236.585 6.001 1.606a7 7 0 1 0-12.002 0z"/>
            </svg>
            <span className="text-[10px]">{playbackRate}x</span>
          </button>
          
          {showSpeedMenu && (
            <div className="absolute bottom-full right-0 mb-1 bg-[#2d3847] rounded-md shadow-xl overflow-hidden z-10 min-w-[60px]">
              {[ 1, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`block w-full px-3 py-1.5 text-xs text-left hover:bg-[#3d4857] transition-colors whitespace-nowrap ${
                    playbackRate === speed ? 'text-[#5b8def] bg-[#3d4857]' : 'text-gray-300'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;