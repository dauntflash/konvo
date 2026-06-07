"use client";
import React, { useEffect, useRef, useState } from "react";

interface RecordingWavesProps {
  isRecording: boolean;
  isPaused?: boolean;
  onPauseResume?: () => void;
}

const RecordingWaves = ({ isRecording, isPaused = false, onPauseResume }: RecordingWavesProps) => {
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium min-w-[60px]">{formatTime(timer)}</span>
      {onPauseResume && (
        <button
          onClick={onPauseResume}
          className="bi bi-pause-fill hover:text-[#5182fe] transition-colors"
        />
      )}
      <div className="flex items-center gap-1 h-8">
        {[...Array(73)].map((_, i) => (
          <div
            key={i}
            className={`w-[.15rem] bg-[#5182fe] rounded-full transition-all duration-150 ${
              isRecording && !isPaused ? "animate-recording-wave" : "h-1"
            }`}
            style={{
              animationDelay: `${i * 0.15}s`,
              opacity: isPaused ? "0.4" : "1",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default RecordingWaves;
