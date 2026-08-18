'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause, AlertCircle } from 'lucide-react';

interface VoiceRecorderProps {
  onSendVoiceMessage: (audioUrl: string, durationSeconds: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoiceMessage, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    startBrowserRecording();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startBrowserRecording = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage("Audio recording isn't supported in this browser environment.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("Microphone access denied or error:", err);
      setErrorMessage("Microphone permission denied. Please allow microphone access in your browser.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSend = () => {
    if (audioBlobUrl) {
      onSendVoiceMessage(audioBlobUrl, recordingTime || 1);
    } else {
      // Fallback preview
      onSendVoiceMessage('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', recordingTime || 5);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="w-full bg-[#131b2e] border border-slate-800 rounded-3xl p-3 shadow-2xl flex items-center justify-between gap-3 text-xs animate-in fade-in z-50">
      
      {errorMessage ? (
        <div className="flex-1 flex items-center gap-2 text-rose-400 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-[11px] leading-tight">{errorMessage}</span>
          <button onClick={onCancel} className="ml-auto text-slate-400 hover:text-white">Close</button>
        </div>
      ) : (
        <>
          {/* Cancel button */}
          <button
            onClick={onCancel}
            className="p-2 rounded-full bg-slate-900 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Cancel Recording"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Recording Timer & Waveform */}
          <div className="flex-1 flex items-center justify-center gap-2 font-mono">
            {isRecording ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="font-extrabold text-white text-xs">{formatTime(recordingTime)}</span>
                
                {/* Waveform Visualizer simulation */}
                <div className="flex items-center gap-1 h-5">
                  <span className="w-1 h-3 bg-[#00B7FF] rounded-full animate-bounce" />
                  <span className="w-1 h-5 bg-[#00B7FF] rounded-full animate-bounce delay-100" />
                  <span className="w-1 h-2 bg-[#00B7FF] rounded-full animate-bounce delay-200" />
                  <span className="w-1 h-4 bg-[#00B7FF] rounded-full animate-bounce delay-300" />
                  <span className="w-1 h-3 bg-[#00B7FF] rounded-full animate-bounce delay-150" />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">🎤 Recorded ({formatTime(recordingTime)})</span>
                {audioBlobUrl && (
                  <audio ref={previewAudioRef} src={audioBlobUrl} onEnded={() => setIsPlayingPreview(false)} className="hidden" />
                )}
                {audioBlobUrl && (
                  <button
                    onClick={() => {
                      if (previewAudioRef.current) {
                        if (isPlayingPreview) {
                          previewAudioRef.current.pause();
                          setIsPlayingPreview(false);
                        } else {
                          previewAudioRef.current.play();
                          setIsPlayingPreview(true);
                        }
                      }
                    }}
                    className="p-1 rounded-full bg-[#00B7FF]/20 text-[#00B7FF]"
                  >
                    {isPlayingPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action Trigger */}
          {isRecording ? (
            <button
              onClick={handleStopRecording}
              className="p-2 rounded-full bg-rose-500 text-white font-bold hover:scale-105 transition-transform"
              title="Stop Recording"
            >
              <Square className="w-4 h-4 fill-white" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              className="p-2.5 rounded-full bg-gradient-to-r from-[#00B7FF] to-purple-600 text-white font-extrabold shadow-md hover:scale-105 transition-transform"
              title="Send Voice Message"
            >
              <Send className="w-4 h-4 fill-white ml-0.5" />
            </button>
          )}
        </>
      )}

    </div>
  );
};
