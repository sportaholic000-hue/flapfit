import { useQueryClient } from '@tanstack/react-query';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { File, Paths, type FileHandle } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowRight,
  Camera,
  Home,
  RotateCcw,
  Share2,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Platform,
  Share,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import BirdAvatar from '@/components/BirdAvatar';
import { competitionIsConfigured, competitionRequest } from '@/services/competitionApi';
import { getBirdStageArt } from '@/utils/game/birdStageArt';
import { loadBirdAssetDataUri } from '@/utils/game/birdWebAsset';
import { getBird } from '@/utils/game/birds';
import { buildGameHtml } from '@/utils/game/gameHtml';
import { ENDLESS_BASE, getLevel, LEVELS } from '@/utils/game/levels';
import {
  prepareMediaPipeAssets,
  readMediaPipeAssetPayload,
  type PreparedMediaPipeAssets,
} from '@/utils/game/mediapipeAssets';
import {
  computeBirdMorphology,
  computeEvolutionStage,
  dayKey,
  EVO_NAMES,
  useGameStore,
} from '@/utils/game/store';

type GameResult = {
  score: number;
  pushups: number;
  tutSeconds: number;
};

type LoadedBirdImage = {
  key: string;
  dataUri: string;
};

type GameWebSource = { html: string; baseUrl: string };

type RecordingPhase = 'idle' | 'recording' | 'preparing' | 'ready' | 'error';

type RecordedVideo = {
  uri: string;
  mimeType: string;
  extension: string;
};

const CONFETTI_COLORS = ['#F59E0B', '#FDE047', '#4ADE80', '#38BDF8', '#A78BFA', '#FB7185'];
// Expo Go camera capture is reliable from an HTTPS-base inline page, while a
// file:// game page can make getUserMedia unavailable even with permission.
// Store builds continue to use the tracker files bundled inside the app.
const USE_REMOTE_TRACKER = __DEV__;
const TRACKER_TRANSFER_CHUNK_SIZE = 96_000;
const CONFETTI_PIECES = Array.from({ length: 22 }, (_, index) => ({
  id: index,
  left: `${4 + ((index * 37) % 92)}%` as `${number}%`,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  size: 6 + (index % 3) * 2,
  travel: 360 + (index % 5) * 34,
  drift: (index % 2 === 0 ? 1 : -1) * (12 + (index % 4) * 7),
  rotation: index % 2 === 0 ? '540deg' : '-540deg',
}));

function formatTrackedTime(seconds: number) {
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainingSeconds = rounded % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64Bytes(value: string) {
  const commaIndex = value.indexOf(',');
  const clean = (commaIndex >= 0 ? value.slice(commaIndex + 1) : value).replace(/\s/g, '');
  if (!clean) return new Uint8Array(0);

  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const output = new Uint8Array(Math.max(0, Math.floor((clean.length * 3) / 4) - padding));
  let outputIndex = 0;

  for (let index = 0; index < clean.length; index += 4) {
    const first = BASE64_ALPHABET.indexOf(clean[index] ?? '');
    const second = BASE64_ALPHABET.indexOf(clean[index + 1] ?? '');
    const thirdChar = clean[index + 2] ?? '=';
    const fourthChar = clean[index + 3] ?? '=';
    const third = thirdChar === '=' ? 0 : BASE64_ALPHABET.indexOf(thirdChar);
    const fourth = fourthChar === '=' ? 0 : BASE64_ALPHABET.indexOf(fourthChar);

    if (first < 0 || second < 0 || third < 0 || fourth < 0) {
      throw new Error('The recorded video contained invalid data.');
    }

    if (outputIndex < output.length) output[outputIndex++] = (first << 2) | (second >> 4);
    if (outputIndex < output.length) output[outputIndex++] = ((second & 15) << 4) | (third >> 2);
    if (outputIndex < output.length) output[outputIndex++] = ((third & 3) << 6) | fourth;
  }

  return output;
}

function normalizeVideoExtension(extension?: string, mimeType?: string) {
  const sanitized = extension
    ?.replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
    .slice(0, 8);
  if (sanitized) return sanitized;
  if (mimeType?.includes('mp4')) return 'mp4';
  if (mimeType?.includes('quicktime')) return 'mov';
  return 'webm';
}

function videoUti(mimeType: string, extension: string) {
  if (mimeType.includes('mp4') || extension === 'mp4') return 'public.mpeg-4';
  if (mimeType.includes('quicktime') || extension === 'mov') return 'com.apple.quicktime-movie';
  if (mimeType.includes('webm') || extension === 'webm') return 'org.webmproject.webm';
  return 'public.movie';
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    mode?: string;
    levelId?: string;
    target?: string;
    challengeCode?: string;
    backgroundMode?: string;
    record?: string;
    trackingMode?: string;
  }>();

  const mode = typeof params.mode === 'string' ? params.mode : 'level';
  const levelId = params.levelId ? parseInt(String(params.levelId), 10) : 1;
  const paramTarget = params.target ? parseInt(String(params.target), 10) : 0;
  const challengeCode = typeof params.challengeCode === 'string' ? params.challengeCode : null;
  const backgroundMode = params.backgroundMode === 'camera' ? 'camera' : 'sky';
  const recordRun = params.record === 'true' || params.record === '1';
  const trackingMode =
    __DEV__ && params.trackingMode === 'form-test' ? 'form-test' : 'original';

  const isEndless = mode === 'endless';
  const level = isEndless ? ENDLESS_BASE : getLevel(levelId);
  const target = isEndless ? 0 : paramTarget > 0 ? paramTarget : level.targetScore;

  const birdId = useGameStore((s) => s.birdId);
  const exerciseMode = useGameStore((s) => s.exerciseMode);
  const playerName = useGameStore((s) => s.playerName);
  const recordSession = useGameStore((s) => s.recordSession);
  const recordTut = useGameStore((s) => s.recordTut);
  const completeDaily = useGameStore((s) => s.completeDaily);
  const addChallengeWon = useGameStore((s) => s.addChallengeWon);
  const totalTutSeconds = useGameStore((s) => s.totalTutSeconds);
  const exerciseTut = useGameStore((s) => s.exerciseTut);
  const lastActivityDate = useGameStore((s) => s.lastActivityDate);
  const unlockedLevel = useGameStore((s) => s.unlockedLevel);
  const unlockedBefore = useRef(useGameStore.getState().unlockedLevel);

  // Compute current evolution
  const currentEvoStage = computeEvolutionStage(totalTutSeconds, lastActivityDate);
  // Capture the stage before this run. Live five-second updates can cross a
  // threshold before game-over, so sampling the "before" stage at game-over
  // would miss the evolution ceremony.
  const runStartEvoStage = useRef(currentEvoStage);
  const birdEvo = useMemo(
    () => ({
      stage: currentEvoStage,
      ...computeBirdMorphology(exerciseTut),
    }),
    [currentEvoStage, exerciseTut]
  );
  // Keep a run's WebView HTML stable even while tracked training-time updates
  // evolve the bird.
  // Changing the HTML source reloads the WebView and used to restart active games.
  const runBirdEvo = useRef(birdEvo);

  const [permission, requestPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [recordWithoutAudio, setRecordWithoutAudio] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [evolvedTo, setEvolvedTo] = useState<number | null>(null);
  const [showEvolutionCeremony, setShowEvolutionCeremony] = useState(false);
  const [loadedBirdImage, setLoadedBirdImage] = useState<LoadedBirdImage | null>(null);
  const [birdImageErrorKey, setBirdImageErrorKey] = useState<string | null>(null);
  const [trackerAssets, setTrackerAssets] = useState<PreparedMediaPipeAssets | null>(null);
  const [trackerLoadError, setTrackerLoadError] = useState<string | null>(null);
  const [trackerRetryKey, setTrackerRetryKey] = useState(0);
  const [recordingPhase, setRecordingPhase] = useState<RecordingPhase>('idle');
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordedVideo, setRecordedVideo] = useState<RecordedVideo | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const gameOverHandled = useRef(false);
  const recordingPhaseRef = useRef<RecordingPhase>('idle');
  const recordingSessionIdRef = useRef<string | null>(null);
  const recordingFileRef = useRef<File | null>(null);
  const recordingHandleRef = useRef<FileHandle | null>(null);
  const recordingMetadataRef = useRef<{ mimeType: string; extension: string } | null>(null);
  const expectedRecordingChunkRef = useRef(0);
  const pendingRecordingChunksRef = useRef(new Map<number, string>());
  const webViewRef = useRef<WebView>(null);
  const trackerTransferTokenRef = useRef(0);
  const trackerRequestIdRef = useRef<string | null>(null);
  const ceremonyOpacity = useRef(new Animated.Value(0)).current;
  const ceremonyScale = useRef(new Animated.Value(0.55)).current;
  const confettiProgress = useRef(new Animated.Value(0)).current;

  const skin = getBird(birdId);

  const updateRecordingPhase = useCallback((phase: RecordingPhase) => {
    recordingPhaseRef.current = phase;
    setRecordingPhase(phase);
  }, []);

  const discardRecording = useCallback(
    (resetUi = true) => {
      try {
        recordingHandleRef.current?.close();
      } catch {
        // The handle may already be closed after a completed recording.
      }
      recordingHandleRef.current = null;
      recordingSessionIdRef.current = null;
      recordingMetadataRef.current = null;
      expectedRecordingChunkRef.current = 0;
      pendingRecordingChunksRef.current.clear();

      const file = recordingFileRef.current;
      recordingFileRef.current = null;
      if (file?.exists) {
        try {
          file.delete();
        } catch (error) {
          console.warn('Failed to remove temporary gameplay video', error);
        }
      }

      if (resetUi) {
        setRecordedVideo(null);
        setRecordingError(null);
        setShareBusy(false);
        updateRecordingPhase('idle');
      }
    },
    [updateRecordingPhase]
  );

  const failRecording = useCallback(
    (message?: string) => {
      discardRecording(false);
      setRecordedVideo(null);
      setShareBusy(false);
      setRecordingError(
        message?.trim() ||
          'Gameplay recording is not available on this device. You can still play normally.'
      );
      updateRecordingPhase('error');
    },
    [discardRecording, updateRecordingPhase]
  );

  const flushRecordingChunks = useCallback(() => {
    const handle = recordingHandleRef.current;
    if (!handle) throw new Error('The temporary video file is not open.');

    while (pendingRecordingChunksRef.current.has(expectedRecordingChunkRef.current)) {
      const index = expectedRecordingChunkRef.current;
      const encoded = pendingRecordingChunksRef.current.get(index);
      pendingRecordingChunksRef.current.delete(index);
      if (encoded == null) break;
      handle.writeBytes(decodeBase64Bytes(encoded));
      expectedRecordingChunkRef.current = index + 1;
    }
  }, []);

  useEffect(() => () => discardRecording(false), [discardRecording]);

  // Resolve exactly one bundled PNG for this run. The request key changes only
  // for a deliberate retry/next-level run, never for five-second TUT updates.
  const birdImageRequestKey = `${skin.id}:${runBirdEvo.current.stage}:${runKey}`;
  const birdImageAsset = useMemo(
    () => getBirdStageArt(skin.id, runBirdEvo.current.stage),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [skin.id, runKey]
  );

  useEffect(() => {
    let cancelled = false;
    setBirdImageErrorKey(null);

    const loadBirdImage = async () => {
      try {
        const dataUri = await loadBirdAssetDataUri(birdImageAsset as number);
        if (!cancelled) setLoadedBirdImage({ key: birdImageRequestKey, dataUri });
      } catch (error) {
        console.error('Failed to preload bird art', error);
        if (!cancelled) setBirdImageErrorKey(birdImageRequestKey);
      }
    };

    void loadBirdImage();
    return () => {
      cancelled = true;
    };
  }, [birdImageAsset, birdImageRequestKey]);

  const birdImageFailed = birdImageErrorKey === birdImageRequestKey;
  const birdImageDataUri =
    !birdImageFailed && loadedBirdImage?.key === birdImageRequestKey
      ? loadedBirdImage.dataUri
      : null;

  useEffect(() => {
    let cancelled = false;
    setTrackerAssets(null);
    setTrackerLoadError(null);

    if (USE_REMOTE_TRACKER) {
      return () => {
        cancelled = true;
      };
    }

    void prepareMediaPipeAssets()
      .then((assets) => {
        if (!cancelled) setTrackerAssets(assets);
      })
      .catch((error) => {
        console.error('Failed to prepare bundled camera tracker', error);
        if (!cancelled) {
          setTrackerLoadError(
            error instanceof Error ? error.message : 'The on-device camera tracker did not load.'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trackerRetryKey]);

  const html = useMemo(
    () => {
      if (!birdImageDataUri) return null;
      return buildGameHtml({
        trackerAssetMode: USE_REMOTE_TRACKER ? 'remote' : 'bundled',
        trackingMode,
        exercise: exerciseMode,
        endless: isEndless,
        speed: level.speed,
        gapFrac: level.gapFrac,
        spawnMs: level.spawnMs,
        movingPipes: level.movingPipes,
        moveAmp: level.moveAmp,
        target,
        maxScore: level.maxScore ?? 0,
        sky1: level.sky1,
        sky2: level.sky2,
        pipe: level.pipe,
        bird: skin,
        birdEvo: runBirdEvo.current,
        birdImageDataUri,
        backgroundMode,
        recordRun,
        recordAudio: recordRun && !recordWithoutAudio && microphonePermission?.granted === true,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      backgroundMode,
      birdImageDataUri,
      exerciseMode,
      isEndless,
      level.id,
      recordRun,
      recordWithoutAudio,
      microphonePermission?.granted,
      skin.id,
      target,
      trackingMode,
      runKey,
    ]
  );

  // Both Expo Go and store builds use an HTTPS-base inline document so camera
  // capture has a trustworthy origin. Production waits for the packaged
  // tracker files, then transfers only the WebView's supported Wasm variant.
  const webSource = useMemo<GameWebSource | null>(() => {
    if (!html || (!USE_REMOTE_TRACKER && !trackerAssets)) return null;
    return { html, baseUrl: 'https://flapfit.local' };
  }, [html, trackerAssets]);

  useEffect(() => {
    trackerTransferTokenRef.current += 1;
    trackerRequestIdRef.current = null;
  }, [runKey, trackerAssets]);

  const sendBundledTrackerAssets = useCallback(
    async (requestId: string, useSimd: boolean) => {
      if (USE_REMOTE_TRACKER || !trackerAssets || !webViewRef.current) return;
      if (trackerRequestIdRef.current === requestId) return;
      trackerRequestIdRef.current = requestId;
      const transferToken = ++trackerTransferTokenRef.current;

      try {
        const payload = await readMediaPipeAssetPayload(trackerAssets, useSimd);
        const entries = Object.entries(payload) as Array<[keyof typeof payload, string]>;
        const totalCharacters = entries.reduce((total, [, value]) => total + value.length, 0);
        let sentCharacters = 0;

        for (const [name, encoded] of entries) {
          const chunkCount = Math.ceil(encoded.length / TRACKER_TRANSFER_CHUNK_SIZE);
          for (let index = 0; index < chunkCount; index += 1) {
            if (trackerTransferTokenRef.current !== transferToken) return;
            const chunk = encoded.slice(
              index * TRACKER_TRANSFER_CHUNK_SIZE,
              (index + 1) * TRACKER_TRANSFER_CHUNK_SIZE
            );
            sentCharacters += chunk.length;
            const progress = Math.min(1, sentCharacters / totalCharacters);
            webViewRef.current?.injectJavaScript(
              `window.__receiveTrackerAssetChunk(${JSON.stringify(name)},${index},${chunkCount},${JSON.stringify(chunk)},${progress});true;`
            );

            // Yield regularly so a large packaged Wasm payload cannot starve
            // rendering or the native bridge on lower-memory phones.
            if (index % 4 === 3) {
              await new Promise<void>((resolve) => setTimeout(resolve, 0));
            }
          }
        }
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : 'The bundled camera tracker could not be read.';
        console.error('Failed to transfer bundled camera tracker', error);
        setTrackerLoadError(detail);
        webViewRef.current?.injectJavaScript(
          `window.__rejectTrackerAssets(${JSON.stringify(detail)});true;`
        );
      }
    },
    [trackerAssets]
  );

  const ceremonyBirdEvo = useMemo(
    () => ({
      stage: evolvedTo ?? currentEvoStage,
      ...computeBirdMorphology(exerciseTut),
    }),
    [currentEvoStage, evolvedTo, exerciseTut]
  );
  const ceremonyBirdSize = Math.max(150, Math.min(210, Math.round(viewportHeight * 0.24)));

  useEffect(() => {
    if (!showEvolutionCeremony) return;

    ceremonyOpacity.setValue(0);
    ceremonyScale.setValue(0.55);
    confettiProgress.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(ceremonyOpacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(ceremonyScale, {
        toValue: 1,
        friction: 6,
        tension: 74,
        useNativeDriver: true,
      }),
      Animated.timing(confettiProgress, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [ceremonyOpacity, ceremonyScale, confettiProgress, showEvolutionCeremony]);

  const submitScores = useCallback(
    async (score: number) => {
      if (!competitionIsConfigured) return;
      try {
        const boardableExercises = ['pushups', 'squats', 'pullups'];
        if (
          isEndless &&
          playerName.trim().length > 0 &&
          boardableExercises.includes(exerciseMode)
        ) {
          await competitionRequest('/leaderboard', {
            method: 'POST',
            body: {
              playerName,
              score,
              exercise: exerciseMode,
            },
          });
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        }
        if (challengeCode) {
          await competitionRequest('/challenges/attempts', {
            method: 'POST',
            body: {
              code: challengeCode,
              playerName: playerName.trim().length > 0 ? playerName : 'Anonymous',
              score,
            },
          });
          queryClient.invalidateQueries({ queryKey: ['challenge', challengeCode] });
        }
      } catch (e) {
        console.error(e);
      }
    },
    [isEndless, playerName, challengeCode, exerciseMode, queryClient]
  );

  const beginVideoRecording = useCallback(
    (sessionId: string, mimeType?: string, extension?: string) => {
      if (!recordRun) return;
      discardRecording(false);

      const normalizedExtension = normalizeVideoExtension(extension, mimeType);
      const normalizedMimeType =
        mimeType?.split(';')[0]?.trim() ||
        (normalizedExtension === 'mp4'
          ? 'video/mp4'
          : normalizedExtension === 'mov'
            ? 'video/quicktime'
            : 'video/webm');
      const safeSessionId =
        sessionId.replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || `run-${Date.now()}`;
      const randomSuffix = Math.random().toString(36).slice(2, 9);
      const file = new File(
        Paths.cache,
        `flap-fit-${Date.now()}-${safeSessionId}-${randomSuffix}.${normalizedExtension}`
      );

      try {
        recordingFileRef.current = file;
        file.create({ overwrite: false });
        recordingHandleRef.current = file.open();
        recordingSessionIdRef.current = sessionId;
        recordingMetadataRef.current = {
          mimeType: normalizedMimeType,
          extension: normalizedExtension,
        };
        expectedRecordingChunkRef.current = 0;
        pendingRecordingChunksRef.current.clear();
        setRecordedVideo(null);
        setRecordingError(null);
        setShareBusy(false);
        updateRecordingPhase('recording');
      } catch (error) {
        failRecording(
          error instanceof Error
            ? `The temporary gameplay video could not be created. ${error.message}`
            : 'The temporary gameplay video could not be created.'
        );
      }
    },
    [discardRecording, failRecording, recordRun, updateRecordingPhase]
  );

  const acceptVideoRecordingChunk = useCallback(
    (sessionId: string, index: number, encodedData: string) => {
      if (!recordRun || sessionId !== recordingSessionIdRef.current) return;
      if (!Number.isInteger(index) || index < 0 || typeof encodedData !== 'string') {
        failRecording('The gameplay recording returned an invalid video chunk.');
        return;
      }
      if (index < expectedRecordingChunkRef.current) return;

      pendingRecordingChunksRef.current.set(index, encodedData);
      try {
        flushRecordingChunks();
      } catch (error) {
        failRecording(
          error instanceof Error
            ? `The gameplay video could not be prepared. ${error.message}`
            : 'The gameplay video could not be prepared.'
        );
      }
    },
    [failRecording, flushRecordingChunks, recordRun]
  );

  const completeVideoRecording = useCallback(
    (
      sessionId: string,
      mimeType: string | undefined,
      extension: string | undefined,
      chunkCount: number
    ) => {
      if (!recordRun || sessionId !== recordingSessionIdRef.current) return;

      try {
        flushRecordingChunks();
        if (
          !Number.isInteger(chunkCount) ||
          chunkCount < 1 ||
          pendingRecordingChunksRef.current.size > 0 ||
          expectedRecordingChunkRef.current !== chunkCount
        ) {
          throw new Error('Some of the recorded video data did not arrive.');
        }

        recordingHandleRef.current?.close();
        recordingHandleRef.current = null;
        recordingSessionIdRef.current = null;
        pendingRecordingChunksRef.current.clear();

        const file = recordingFileRef.current;
        if (!file?.exists || file.size <= 0) {
          throw new Error('The recorded video was empty.');
        }

        const startMetadata = recordingMetadataRef.current;
        const normalizedExtension =
          startMetadata?.extension ?? normalizeVideoExtension(extension, mimeType);
        const normalizedMimeType =
          startMetadata?.mimeType ??
          mimeType?.split(';')[0]?.trim() ??
          (normalizedExtension === 'mp4' ? 'video/mp4' : 'video/webm');
        recordingMetadataRef.current = null;
        setRecordedVideo({
          uri: file.uri,
          mimeType: normalizedMimeType,
          extension: normalizedExtension,
        });
        setRecordingError(null);
        updateRecordingPhase('ready');
      } catch (error) {
        failRecording(
          error instanceof Error
            ? `The gameplay video could not be completed. ${error.message}`
            : 'The gameplay video could not be completed.'
        );
      }
    },
    [failRecording, flushRecordingChunks, recordRun, updateRecordingPhase]
  );

  const shareRecordedVideo = useCallback(async () => {
    if (!recordedVideo || shareBusy) return;
    setShareBusy(true);
    setRecordingError(null);

    try {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device.');
      }
      await Sharing.shareAsync(recordedVideo.uri, {
        dialogTitle: 'Share your Flap Fit gameplay video',
        mimeType: recordedVideo.mimeType,
        UTI: videoUti(recordedVideo.mimeType, recordedVideo.extension),
      });
    } catch (error) {
      setRecordingError(
        error instanceof Error
          ? `The video is ready, but it could not be shared. ${error.message}`
          : 'The video is ready, but it could not be shared. Please try again.'
      );
    } finally {
      setShareBusy(false);
    }
  }, [recordedVideo, shareBusy]);

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      let msg: {
        type?: string;
        score?: number;
        pushups?: number;
        tutSeconds?: number;
        unreportedTutSeconds?: number;
        seconds?: number;
        asset?: string;
        sessionId?: string;
        mimeType?: string;
        extension?: string;
        index?: number;
        data?: string;
        chunkCount?: number;
        message?: string;
        requestId?: string;
        simd?: boolean;
      } = {};
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      if (msg.type === 'trackerassetrequest') {
        if (typeof msg.requestId !== 'string' || msg.requestId.length === 0) {
          console.error('The game requested tracker assets without a request ID.');
          return;
        }
        void sendBundledTrackerAssets(msg.requestId, msg.simd !== false);
        return;
      }

      if (msg.type === 'recordingstart') {
        if (typeof msg.sessionId !== 'string' || msg.sessionId.length === 0) {
          failRecording('The gameplay recorder did not provide a valid recording session.');
          return;
        }
        beginVideoRecording(msg.sessionId, msg.mimeType, msg.extension);
        return;
      }
      if (msg.type === 'recordingchunk') {
        if (
          typeof msg.sessionId !== 'string' ||
          typeof msg.index !== 'number' ||
          typeof msg.data !== 'string'
        ) {
          failRecording('The gameplay recorder returned an invalid video chunk.');
          return;
        }
        acceptVideoRecordingChunk(msg.sessionId, msg.index, msg.data);
        return;
      }
      if (msg.type === 'recordingcomplete') {
        if (typeof msg.sessionId !== 'string' || typeof msg.chunkCount !== 'number') {
          failRecording('The gameplay recorder could not finish the temporary video.');
          return;
        }
        completeVideoRecording(msg.sessionId, msg.mimeType, msg.extension, msg.chunkCount);
        return;
      }
      if (msg.type === 'recordingerror') {
        failRecording(
          msg.message ||
            'Gameplay recording is not available on this device. You can still play normally.'
        );
        return;
      }
      if (msg.type === 'trackingerror') {
        console.error('Camera tracker failed inside the game WebView', msg.message ?? 'Unknown error');
        return;
      }

      // `tut` is the legacy persisted field/event name. It currently means
      // tracked active gameplay time, not pose/form-verified physiological TUT.
      if (msg.type === 'asseterror' && msg.asset === 'bird') {
        setBirdImageErrorKey(birdImageRequestKey);
      } else if (msg.type === 'tut' && msg.seconds) {
        recordTut(msg.seconds, exerciseMode);
      } else if (msg.type === 'score') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } else if (msg.type === 'calibrated') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else if (msg.type === 'gameover') {
        if (gameOverHandled.current) return;
        gameOverHandled.current = true;
        if (recordRun && recordingPhaseRef.current === 'recording') {
          updateRecordingPhase('preparing');
        } else if (recordRun && recordingPhaseRef.current === 'idle') {
          failRecording(
            'Recording did not start on this device. Your game result was still saved normally.'
          );
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        const score = msg.score ?? 0;
        const pushups = msg.pushups ?? 0;
        const tutSecs = Math.max(0, msg.tutSeconds ?? 0);
        const unreportedTutSecs = Math.min(
          tutSecs,
          Math.max(0, msg.unreportedTutSeconds ?? tutSecs % 5)
        );
        const prevStage = runStartEvoStage.current;
        // Record the exact amount not already delivered by five-second
        // heartbeats. Using rounded total % 5 could lose almost five seconds.
        if (unreportedTutSecs > 0) recordTut(unreportedTutSecs, exerciseMode);
        recordSession({
          exercise: exerciseMode,
          score,
          pushups,
          mode,
          levelId: isEndless ? null : level.id,
          tutSeconds: tutSecs,
        });
        if (mode === 'daily' && score >= target) completeDaily(dayKey());
        if (challengeCode && score >= target) addChallengeWon();
        submitScores(score);
        const newStage = computeEvolutionStage(
          useGameStore.getState().totalTutSeconds,
          useGameStore.getState().lastActivityDate
        );
        if (newStage > prevStage) {
          setEvolvedTo(newStage);
          setShowEvolutionCeremony(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        setResult({ score, pushups, tutSeconds: Math.round(tutSecs) });
      }
    },
    [
      mode,
      level.id,
      isEndless,
      target,
      challengeCode,
      exerciseMode,
      recordSession,
      recordTut,
      completeDaily,
      addChallengeWon,
      submitScores,
      birdImageRequestKey,
      recordRun,
      beginVideoRecording,
      acceptVideoRecordingChunk,
      completeVideoRecording,
      failRecording,
      updateRecordingPhase,
      sendBundledTrackerAssets,
    ]
  );

  const retry = () => {
    discardRecording();
    // A retry gets the newest evolution; an in-progress run never reloads for it.
    runBirdEvo.current = birdEvo;
    const state = useGameStore.getState();
    runStartEvoStage.current = computeEvolutionStage(state.totalTutSeconds, state.lastActivityDate);
    gameOverHandled.current = false;
    setResult(null);
    setEvolvedTo(null);
    setShowEvolutionCeremony(false);
    setRunKey((k) => k + 1);
  };

  const goToNextLevel = () => {
    const nextLevelId = level.id + 1;
    if (
      mode !== 'level' ||
      level.id >= LEVELS.length ||
      useGameStore.getState().unlockedLevel < nextLevelId
    ) {
      return;
    }

    discardRecording();
    // Prepare a clean run before replacing this route with the next standard
    // level. This also keeps the newest bird evolution without reloading an
    // active game.
    runBirdEvo.current = birdEvo;
    const state = useGameStore.getState();
    runStartEvoStage.current = computeEvolutionStage(state.totalTutSeconds, state.lastActivityDate);
    unlockedBefore.current = state.unlockedLevel;
    gameOverHandled.current = false;
    setResult(null);
    setEvolvedTo(null);
    setShowEvolutionCeremony(false);
    setRunKey((k) => k + 1);
    router.replace({
      pathname: '/game',
      params: {
        mode: 'level',
        levelId: String(nextLevelId),
        backgroundMode,
        record: recordRun ? 'true' : 'false',
      },
    });
  };
  const leaveGame = useCallback(() => {
    discardRecording();
    router.back();
  }, [discardRecording, router]);
  const shareEvolution = useCallback(() => {
    if (evolvedTo === null) return;

    const stageNumber = evolvedTo + 1;
    void Share.share({
      title: 'Flap Fit Evolution',
      message:
        `My Flap Fit bird just reached Stage ${stageNumber}/${EVO_NAMES.length} — ` +
        `${EVO_NAMES[evolvedTo]} after ${formatTrackedTime(totalTutSeconds)} of tracked training!`,
    }).catch((error) => console.error(error));
  }, [evolvedTo, totalTutSeconds]);

  // Camera permission gate
  const needsCameraPermission = permission != null && !permission.granted;
  const microphonePermissionLoading = recordRun && !recordWithoutAudio && microphonePermission == null;
  if (permission == null || microphonePermissionLoading) {
    return <View style={{ flex: 1, backgroundColor: '#0F172A' }} />;
  }

  if (needsCameraPermission) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#0F172A',
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 28,
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <StatusBar style="light" />
        <Camera size={44} color="#F59E0B" />
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900' }}>
          Camera access needed
        </Text>
        <Text style={{ color: '#CBD5E1', fontSize: 15, lineHeight: 22 }}>
          Flap Fit uses your front camera to track your body movement.{'\n\n'}All tracking runs on
          your device. Video is recorded only when you explicitly select Record &amp; Play. With your
          permission, that recording includes microphone sound. It is kept temporarily for sharing
          and is not uploaded by Flap Fit.
          {!permission.canAskAgain
            ? '\n\nCamera access is currently blocked. Open your phone settings to allow it.'
            : ''}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={permission.canAskAgain ? 'Allow camera' : 'Open camera settings'}
          onPress={() => {
            if (permission.canAskAgain) void requestPermission();
            else void Linking.openSettings();
          }}
          style={{
            backgroundColor: '#F59E0B',
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 16 }}>
            {permission.canAskAgain ? 'Allow camera' : 'Open settings'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={leaveGame} style={{ alignItems: 'center', paddingVertical: 4 }}>
          <Text style={{ color: '#64748B', fontWeight: '700' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const needsMicrophonePermission =
    recordRun && !recordWithoutAudio && microphonePermission != null && !microphonePermission.granted;
  if (needsMicrophonePermission) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#0F172A',
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 28,
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <StatusBar style="light" />
        <Camera size={44} color="#F59E0B" />
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900' }}>
          Add sound to your video
        </Text>
        <Text style={{ color: '#CBD5E1', fontSize: 15, lineHeight: 22 }}>
          Record &amp; Play can include your voice and workout sounds. Microphone audio stays inside
          the temporary video on this device unless you choose to share it.
          {!microphonePermission.canAskAgain
            ? '\n\nMicrophone access is currently blocked. Open your phone settings to allow it.'
            : ''}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            microphonePermission.canAskAgain ? 'Allow microphone' : 'Open microphone settings'
          }
          onPress={() => {
            if (microphonePermission.canAskAgain) void requestMicrophonePermission();
            else void Linking.openSettings();
          }}
          style={{
            backgroundColor: '#F59E0B',
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 16 }}>
            {microphonePermission.canAskAgain ? 'Allow microphone' : 'Open settings'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Continue recording without sound"
          onPress={() => setRecordWithoutAudio(true)}
          style={{ alignItems: 'center', paddingVertical: 8 }}
        >
          <Text style={{ color: '#CBD5E1', fontWeight: '800' }}>Continue without sound</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={leaveGame} style={{ alignItems: 'center', paddingVertical: 4 }}>
          <Text style={{ color: '#64748B', fontWeight: '700' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cleared = result != null && !isEndless && result.score >= target;
  const nextUnlocked =
    cleared && mode === 'level' && level.id === unlockedBefore.current && level.id < LEVELS.length;
  const canGoNextLevel =
    cleared && mode === 'level' && level.id < LEVELS.length && unlockedLevel >= level.id + 1;
  const tutMinDisplay = result ? Math.floor(result.tutSeconds / 60) : 0;
  const tutSecDisplay = result ? result.tutSeconds % 60 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: level.sky1 }}>
      <StatusBar style="light" hidden={Platform.OS === 'ios'} />
      {webSource ? (
        <WebView
          ref={webViewRef}
          key={runKey}
          source={webSource}
          style={{ flex: 1, backgroundColor: level.sky1 }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess={false}
          allowFileAccessFromFileURLs={false}
          allowUniversalAccessFromFileURLs={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          onMessage={onMessage}
          allowsFullscreenVideo={false}
          bounces={false}
          scrollEnabled={false}
          overScrollMode="never"
        />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            backgroundColor: level.sky1,
          }}
        >
          {birdImageErrorKey === birdImageRequestKey || trackerLoadError ? null : (
            <ActivityIndicator color="#FFFFFF" size="large" />
          )}
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
            {birdImageErrorKey === birdImageRequestKey
              ? 'Your bird did not load.'
              : trackerLoadError
                ? 'The on-device camera tracker did not load.'
                : USE_REMOTE_TRACKER || trackerAssets
                  ? 'Starting your game…'
                  : 'Preparing on-device tracking…'}
          </Text>
          {birdImageErrorKey === birdImageRequestKey || trackerLoadError ? (
            <TouchableOpacity
              onPress={() => {
                if (birdImageErrorKey === birdImageRequestKey) {
                  setRunKey((key) => key + 1);
                }
                if (trackerLoadError) setTrackerRetryKey((key) => key + 1);
              }}
              style={{
                borderRadius: 14,
                backgroundColor: 'rgba(15,23,42,0.82)',
                paddingHorizontal: 22,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900' }}>Try again</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {!result ? (
        <TouchableOpacity
          onPress={leaveGame}
          style={{
            position: 'absolute',
            top: insets.top + 10,
            left: 14,
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: 'rgba(0,0,0,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}

      {!result && recordingPhase === 'recording' ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: insets.top + 12,
            right: 14,
            borderRadius: 999,
            backgroundColor: 'rgba(127,29,29,0.9)',
            paddingHorizontal: 12,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#FCA5A5' }} />
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }}>
            RECORDING
          </Text>
        </View>
      ) : null}

      {result && showEvolutionCeremony && evolvedTo !== null ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            backgroundColor: '#0F172A',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 24,
          }}
        >
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            {CONFETTI_PIECES.map((piece) => (
              <Animated.View
                key={piece.id}
                style={{
                  position: 'absolute',
                  top: -20,
                  left: piece.left,
                  width: piece.size,
                  height: piece.size * 1.7,
                  borderRadius: 2,
                  backgroundColor: piece.color,
                  opacity: confettiProgress.interpolate({
                    inputRange: [0, 0.08, 0.82, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                  transform: [
                    {
                      translateY: confettiProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, piece.travel],
                      }),
                    },
                    {
                      translateX: confettiProgress.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, piece.drift, -piece.drift * 0.4],
                      }),
                    },
                    {
                      rotate: confettiProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', piece.rotation],
                      }),
                    },
                  ],
                }}
              />
            ))}
          </View>

          <Animated.View
            style={{
              width: '100%',
              maxWidth: 390,
              alignItems: 'center',
              opacity: ceremonyOpacity,
              transform: [{ scale: ceremonyScale }],
            }}
          >
            <Sparkles size={34} color="#FDE047" />
            <Text
              style={{
                color: '#FDE047',
                fontSize: 30,
                fontWeight: '900',
                letterSpacing: 1.5,
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              EVOLUTION!
            </Text>
            <View
              style={{
                backgroundColor: '#F59E0B',
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 7,
                marginTop: 10,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 14 }}>
                STAGE {evolvedTo + 1}/{EVO_NAMES.length}
              </Text>
            </View>

            <View style={{ marginTop: 12 }}>
              <BirdAvatar skin={skin} size={ceremonyBirdSize} evo={ceremonyBirdEvo} />
            </View>
            <Text
              style={{
                color: '#FFFFFF',
                fontWeight: '900',
                fontSize: 24,
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              {EVO_NAMES[evolvedTo]}
            </Text>
            <Text style={{ color: '#CBD5E1', fontSize: 14, marginTop: 3, textAlign: 'center' }}>
              {skin.name} grew stronger from your training.
            </Text>

            <View
              style={{
                width: '100%',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.18)',
                padding: 14,
                alignItems: 'center',
                marginTop: 16,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 24 }}>
                {formatTrackedTime(totalTutSeconds)}
              </Text>
              <Text
                style={{
                  color: '#93C5FD',
                  fontWeight: '800',
                  fontSize: 11,
                  letterSpacing: 0.8,
                  marginTop: 2,
                }}
              >
                LIFETIME TRACKED TRAINING
              </Text>
              <Text style={{ color: '#CBD5E1', fontSize: 11, marginTop: 4 }}>
                +{formatTrackedTime(result.tutSeconds)} this run
              </Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Share my Flap Fit evolution"
              onPress={shareEvolution}
              style={{
                width: '100%',
                backgroundColor: '#F59E0B',
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                marginTop: 16,
              }}
            >
              <Share2 size={19} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15 }}>
                Share my evolution
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setShowEvolutionCeremony(false)}
              style={{ paddingVertical: 13, paddingHorizontal: 24, marginTop: 4 }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                Continue to results
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      ) : null}

      {result && (!showEvolutionCeremony || evolvedTo === null) ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15,23,42,0.72)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 28,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 24,
              width: '100%',
              maxWidth: 380,
              alignItems: 'center',
            }}
          >
            <Trophy size={36} color={cleared ? '#F59E0B' : '#94A3B8'} />
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A', marginTop: 8 }}>
              {cleared
                ? mode === 'daily'
                  ? 'Daily done!'
                  : challengeCode
                    ? 'Challenge beaten!'
                    : 'Level cleared!'
                : 'Run over'}
            </Text>
            {nextUnlocked ? (
              <Text style={{ color: '#16A34A', fontWeight: '800', marginTop: 4 }}>
                Level {level.id + 1} unlocked 🎉
              </Text>
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                gap: 14,
                marginTop: 16,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 26, fontWeight: '900', color: '#F59E0B' }}>
                  {result.score}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>PIPES</Text>
              </View>

              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 26, fontWeight: '900', color: '#0284C7' }}>
                  {tutMinDisplay > 0 ? `${tutMinDisplay}m ${tutSecDisplay}s` : `${tutSecDisplay}s`}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>
                  TRAINING TIME
                </Text>
              </View>
            </View>
            {!isEndless && !cleared ? (
              <Text style={{ color: '#64748B', fontSize: 13, marginTop: 12 }}>
                Target: {target} pipes — keep pushing!
              </Text>
            ) : null}
            {recordRun && recordingPhase === 'preparing' ? (
              <View
                style={{
                  width: '100%',
                  marginTop: 16,
                  borderRadius: 16,
                  backgroundColor: '#EFF6FF',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={{ color: '#1E3A8A', fontSize: 14, fontWeight: '900' }}>
                  Preparing video…
                </Text>
              </View>
            ) : null}
            {recordRun && recordingPhase === 'ready' && recordedVideo ? (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Share gameplay video"
                  disabled={shareBusy}
                  onPress={() => void shareRecordedVideo()}
                  style={{
                    marginTop: 16,
                    backgroundColor: '#2563EB',
                    borderRadius: 16,
                    paddingVertical: 15,
                    width: '100%',
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 9,
                    opacity: shareBusy ? 0.72 : 1,
                  }}
                >
                  {shareBusy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Share2 size={20} color="#FFFFFF" />
                  )}
                  <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 16 }}>
                    {shareBusy ? 'Opening share options…' : 'Share gameplay video'}
                  </Text>
                </TouchableOpacity>
                <Text
                  style={{
                    color: '#64748B',
                    fontSize: 11,
                    lineHeight: 16,
                    marginTop: 6,
                    textAlign: 'center',
                  }}
                >
                  Kept temporarily for sharing and removed when you leave or start another run.
                </Text>
              </>
            ) : null}
            {recordRun && recordingPhase === 'error' ? (
              <View
                style={{
                  width: '100%',
                  marginTop: 16,
                  borderRadius: 14,
                  backgroundColor: '#FEF2F2',
                  borderWidth: 1,
                  borderColor: '#FECACA',
                  padding: 12,
                }}
              >
                <Text style={{ color: '#991B1B', fontSize: 13, fontWeight: '900' }}>
                  Recording unavailable
                </Text>
                <Text
                  selectable
                  style={{ color: '#7F1D1D', fontSize: 12, lineHeight: 17, marginTop: 3 }}
                >
                  {recordingError || 'Your result was saved, but this run could not be recorded.'}
                </Text>
              </View>
            ) : null}
            {recordRun && recordingPhase === 'ready' && recordingError ? (
              <Text
                selectable
                style={{
                  color: '#B91C1C',
                  fontSize: 12,
                  lineHeight: 17,
                  marginTop: 8,
                  textAlign: 'center',
                }}
              >
                {recordingError}
              </Text>
            ) : null}
            {canGoNextLevel ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Start Level ${level.id + 1}`}
                onPress={goToNextLevel}
                style={{
                  marginTop: recordRun ? 12 : 18,
                  backgroundColor: '#F59E0B',
                  borderRadius: 16,
                  paddingVertical: 15,
                  width: '100%',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 16 }}>
                  Next level
                </Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={retry}
              style={{
                marginTop: canGoNextLevel ? 10 : 18,
                backgroundColor: canGoNextLevel ? '#FFF7ED' : '#F59E0B',
                borderRadius: 16,
                paddingVertical: 14,
                width: '100%',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                borderWidth: canGoNextLevel ? 1.5 : 0,
                borderColor: '#F59E0B',
              }}
            >
              <RotateCcw size={18} color={canGoNextLevel ? '#C2410C' : '#FFFFFF'} />
              <Text
                style={{
                  color: canGoNextLevel ? '#C2410C' : '#FFFFFF',
                  fontWeight: '900',
                  fontSize: 15,
                }}
              >
                Try again
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={leaveGame}
              style={{
                marginTop: 10,
                backgroundColor: '#F1F5F9',
                borderRadius: 16,
                paddingVertical: 14,
                width: '100%',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Home size={18} color="#0F172A" />
              <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 15 }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}
