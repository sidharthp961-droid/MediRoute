// ─── Safe Journey Simulation Hook (Local Presentation Mode) ───
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Coordinates } from '@/types';
import type { RouteOption, RouteStep } from '@/lib/routing';
import { haversineDistance, formatDistance } from '@/lib/utils';

export interface JourneySimulationState {
  isActive: boolean;
  isPaused: boolean;
  progressPercent: number;
  currentCoord: Coordinates | null;
  distanceRemainingKm: string;
  distanceRemainingMetres: number;
  etaMinutesRemaining: number;
  formattedArrivalTime: string;
  currentManeuver: string | null;
  distanceToNextManeuver: string;
  nextStepPreview: string | null;
  speedMultiplier: number;
  simulatedSpeedKmH: number;
  voiceEnabled: boolean;
  isVoiceSupported: boolean;
  traversedCoordinates: [number, number][];
  remainingCoordinates: [number, number][];
}

export function useJourneySimulation(route: RouteOption | null, destinationName = 'Hospital') {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentCoord, setCurrentCoord] = useState<Coordinates | null>(null);
  const [distanceRemainingMetres, setDistanceRemainingMetres] = useState(0);
  const [etaMinutesRemaining, setEtaMinutesRemaining] = useState(0);
  const [currentManeuver, setCurrentManeuver] = useState<string | null>(null);
  const [distanceToNextManeuver, setDistanceToNextManeuver] = useState<string>('Straight');
  const [nextStepPreview, setNextStepPreview] = useState<string | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(2); // 2x default for smooth presentation
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const isVoiceSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const lastAnnouncedStepIndexRef = useRef<number>(-1);

  // Spoken voice advisory helper
  const speak = useCallback(
    (text: string) => {
      if (!isVoiceSupported || !voiceEnabled) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.lang = 'en-IN';
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[Voice Navigation] Speech synthesis failed:', err);
      }
    },
    [isVoiceSupported, voiceEnabled],
  );

  // Reset when route changes
  useEffect(() => {
    if (route && route.coordinates.length > 0) {
      const first = route.coordinates[0];
      setCurrentCoord({ lat: first[0], lng: first[1] });
      setDistanceRemainingMetres(route.distanceMetres);
      setEtaMinutesRemaining(Math.round(route.durationSeconds / 60));
      if (route.steps && route.steps.length > 0) {
        setCurrentManeuver(route.steps[0].instruction);
        setDistanceToNextManeuver(formatDistance(route.steps[0].distanceMetres));
        if (route.steps.length > 1) {
          setNextStepPreview(route.steps[1].instruction);
        }
      }
    } else {
      setIsActive(false);
      setIsPaused(false);
      setCurrentCoord(null);
    }
  }, [route]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopSimulation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsActive(false);
    setIsPaused(false);
    setProgressPercent(0);
    lastTimestampRef.current = null;
    lastAnnouncedStepIndexRef.current = -1;

    if (route && route.coordinates.length > 0) {
      const first = route.coordinates[0];
      setCurrentCoord({ lat: first[0], lng: first[1] });
      setDistanceRemainingMetres(route.distanceMetres);
      setEtaMinutesRemaining(Math.round(route.durationSeconds / 60));
    }
    if (isVoiceSupported) {
      window.speechSynthesis.cancel();
    }
  }, [route, isVoiceSupported]);

  const startSimulation = useCallback(() => {
    if (!route || route.coordinates.length < 2) return;
    setIsActive(true);
    setIsPaused(false);
    setProgressPercent(0);
    lastTimestampRef.current = null;
    lastAnnouncedStepIndexRef.current = -1;

    const initialCoord = { lat: route.coordinates[0][0], lng: route.coordinates[0][1] };
    setCurrentCoord(initialCoord);
    setDistanceRemainingMetres(route.distanceMetres);
    setEtaMinutesRemaining(Math.round(route.durationSeconds / 60));

    speak(`Starting demo navigation to ${destinationName}. Safe road corridor loaded.`);
  }, [route, destinationName, speak]);

  const pauseSimulation = useCallback(() => {
    setIsPaused(true);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    lastTimestampRef.current = null;
    speak('Navigation paused.');
  }, [speak]);

  const resumeSimulation = useCallback(() => {
    if (!isActive) return;
    setIsPaused(false);
    lastTimestampRef.current = null;
    speak('Resuming navigation.');
  }, [isActive, speak]);

  // Main animation frame loop
  useEffect(() => {
    if (!isActive || isPaused || !route || route.coordinates.length < 2) {
      return;
    }

    const coords = route.coordinates;
    const totalPoints = coords.length;
    const totalDurationMs = (route.durationSeconds / speedMultiplier) * 1000;

    const step = (timestamp: number) => {
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;
      }
      const deltaMs = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      // Increment progress
      const progressDelta = deltaMs / totalDurationMs;
      const newProgress = Math.min(progressPercent + progressDelta, 1);
      setProgressPercent(newProgress);

      // Compute exact position along route polyline
      const totalIndexSpan = totalPoints - 1;
      const exactIndex = newProgress * totalIndexSpan;
      const lowerIndex = Math.min(Math.floor(exactIndex), totalPoints - 2);
      const upperIndex = lowerIndex + 1;
      const fraction = exactIndex - lowerIndex;

      const p1 = coords[lowerIndex];
      const p2 = coords[upperIndex];

      const lat = p1[0] + (p2[0] - p1[0]) * fraction;
      const lng = p1[1] + (p2[1] - p1[1]) * fraction;
      const newCoord = { lat, lng };
      setCurrentCoord(newCoord);

      // Calculate remaining distance and simulated ETA
      const remainingMetres = Math.max(0, Math.round(route.distanceMetres * (1 - newProgress)));
      setDistanceRemainingMetres(remainingMetres);
      const remainingEta = Math.max(0, Math.round((route.durationSeconds * (1 - newProgress)) / 60));
      setEtaMinutesRemaining(remainingEta);

      // Update maneuvers & speech announcements
      if (route.steps && route.steps.length > 0) {
        // Find next step based on proximity
        const nextStepIdx = route.steps.findIndex((s, idx) => {
          if (idx <= lastAnnouncedStepIndexRef.current) return false;
          const d = haversineDistance(newCoord, { lat: s.location[0], lng: s.location[1] });
          return d < 350; // Trigger announcement when within 350m of turn
        });

        if (nextStepIdx !== -1 && nextStepIdx !== lastAnnouncedStepIndexRef.current) {
          const stepInfo = route.steps[nextStepIdx];
          const distToTurn = Math.round(
            haversineDistance(newCoord, { lat: stepInfo.location[0], lng: stepInfo.location[1] }),
          );
          setCurrentManeuver(stepInfo.instruction);
          setDistanceToNextManeuver(formatDistance(distToTurn));

          if (route.steps[nextStepIdx + 1]) {
            setNextStepPreview(route.steps[nextStepIdx + 1].instruction);
          }

          lastAnnouncedStepIndexRef.current = nextStepIdx;
          speak(`In ${Math.max(50, distToTurn)} metres, ${stepInfo.instruction}`);
        }
      }

      if (newProgress >= 1) {
        // Reached destination
        setIsActive(false);
        setIsPaused(false);
        setDistanceRemainingMetres(0);
        setEtaMinutesRemaining(0);
        speak(`You have reached ${destinationName}. Demo journey complete.`);
      } else {
        animationFrameRef.current = requestAnimationFrame(step);
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, isPaused, progressPercent, route, speedMultiplier, destinationName, speak]);

  // Compute traversed and remaining route splits for distinct styling
  const { traversedCoordinates, remainingCoordinates } = useMemo(() => {
    if (!route || !route.coordinates.length) {
      return { traversedCoordinates: [], remainingCoordinates: [] };
    }
    const coords = route.coordinates;
    const splitIndex = Math.min(
      Math.floor(progressPercent * (coords.length - 1)),
      coords.length - 1,
    );

    const traversed = coords.slice(0, splitIndex + 1);
    const remaining = coords.slice(splitIndex);

    // If currently between points, include currentCoord at boundary for smooth seam
    if (currentCoord && remaining.length > 0) {
      remaining[0] = [currentCoord.lat, currentCoord.lng];
      if (traversed.length > 0) {
        traversed[traversed.length - 1] = [currentCoord.lat, currentCoord.lng];
      }
    }

    return { traversedCoordinates: traversed, remainingCoordinates: remaining };
  }, [route, progressPercent, currentCoord]);

  // Formatted arrival clock time (e.g. "11:24 AM")
  const formattedArrivalTime = useMemo(() => {
    const arrivalDate = new Date(Date.now() + etaMinutesRemaining * 60 * 1000);
    return arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [etaMinutesRemaining]);

  // Simulated road speed in km/h (standard average road speed 45 km/h * speedMultiplier)
  const simulatedSpeedKmH = isActive && !isPaused ? Math.round(45 * Math.min(speedMultiplier, 3)) : 0;

  return {
    isActive,
    isPaused,
    progressPercent,
    currentCoord,
    distanceRemainingMetres,
    distanceRemainingKm: (distanceRemainingMetres / 1000).toFixed(1) + ' km',
    etaMinutesRemaining,
    formattedArrivalTime,
    currentManeuver,
    distanceToNextManeuver,
    nextStepPreview,
    speedMultiplier,
    simulatedSpeedKmH,
    voiceEnabled,
    isVoiceSupported,
    traversedCoordinates,
    remainingCoordinates,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    setSpeedMultiplier,
    toggleVoice: () => setVoiceEnabled((v) => !v),
  };
}
