'use client';

import { useEffect, useState, useRef } from 'react';
import { getActiveEmergency, resolveEmergency } from '@/app/actions/emergency';
import { showToast } from '@/app/components/Toast';

export function EmergencyListener() {
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Poll for emergency every 3 seconds
    const poll = async () => {
      try {
        const event = await getActiveEmergency();
        if (event && event.status === 'ACTIVE') {
          if (!activeEvent || activeEvent.id !== event.id) {
            setActiveEvent(event);
            triggerEmergencyEffects();
          }
        } else {
          setActiveEvent(null);
          stopEmergencyEffects();
        }
      } catch (err) {}
    };

    const poller = setInterval(poll, 3000);
    return () => clearInterval(poller);
  }, [activeEvent]);

  const playBeep = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start();
      oscillator.stop(ctx.currentTime + 1);
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  };

  const triggerEmergencyEffects = () => {
    // Vibration
    if (navigator.vibrate) {
      intervalRef.current = setInterval(() => {
        navigator.vibrate([300, 100, 300, 100, 300]);
      }, 1000);
    }

    // Play once immediately
    playBeep();

    // Then beep continuously every 5 seconds
    audioIntervalRef.current = setInterval(() => {
      playBeep();
    }, 5000);
  };

  const stopEmergencyEffects = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    if (navigator.vibrate) navigator.vibrate(0);
  };

  const handleResolve = async () => {
    if (activeEvent) {
      await resolveEmergency(activeEvent.id);
      showToast('Emergency resolved.', 'success');
      setActiveEvent(null);
      stopEmergencyEffects();
    }
  };

  if (!activeEvent) return null;

  return (
    <div className="fixed inset-0 z-[999] pointer-events-auto flex items-center justify-center bg-status-danger/40 animate-pulse backdrop-blur-sm">
      <div className="bg-status-danger text-on-error p-8 rounded-3xl shadow-2xl flex flex-col items-center justify-center transform scale-110 border-4 border-on-error max-w-[90vw]">
        <span className="material-symbols-outlined text-[120px] mb-4 animate-bounce">warning</span>
        <h1 className="font-headline-lg text-5xl font-bold uppercase tracking-widest text-center">EMERGENCY</h1>
        <p className="font-body-lg text-2xl mt-4 font-bold text-center">{activeEvent.type}</p>
        <p className="font-body-md text-xl mt-2 opacity-90 text-center mb-8">Triggered by: {activeEvent.triggeredBy}</p>
        
        <button 
          onClick={handleResolve}
          className="w-full bg-on-error text-status-danger font-headline-md text-headline-md py-4 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">stop_circle</span>
          RESOLVE EMERGENCY
        </button>
      </div>
    </div>
  );
}
