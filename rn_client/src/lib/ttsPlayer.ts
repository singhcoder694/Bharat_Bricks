import { Audio } from "expo-av";
import { File, Paths } from "expo-file-system";
import type { TtsSegment } from "./types";

let activeSound: Audio.Sound | null = null;

async function stopCurrent(): Promise<void> {
  if (!activeSound) return;
  try {
    await activeSound.stopAsync();
    await activeSound.unloadAsync();
  } catch {}
  activeSound = null;
}

export type TtsProgressCallback = (progress: number) => void;

async function playSingleSegment(
  segment: TtsSegment,
  onProgress?: (segProgress: number) => void,
): Promise<void> {
  const filename = `tts_${Date.now()}.mp3`;
  const file = new File(Paths.cache, filename);

  try {
    file.create({ overwrite: true });
  } catch {}

  file.write(segment.data, { encoding: "base64" });

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
  });

  const { sound } = await Audio.Sound.createAsync({ uri: file.uri });
  activeSound = sound;
  await sound.setProgressUpdateIntervalAsync(80);

  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      sound.setOnPlaybackStatusUpdate(null);
      sound.unloadAsync().catch(() => {});
      try { file.delete(); } catch {}
      if (activeSound === sound) activeSound = null;
      resolve();
    };

    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) {
        finish();
        return;
      }
      if (onProgress && status.durationMillis && status.durationMillis > 0) {
        onProgress(status.positionMillis / status.durationMillis);
      }
      if (status.didJustFinish) {
        finish();
      }
    });
    sound.playAsync().catch(() => finish());
  });
}

export async function playTtsSegments(
  segments: TtsSegment[],
  onProgress?: TtsProgressCallback,
): Promise<void> {
  await stopCurrent();
  const total = segments.length;
  for (let i = 0; i < total; i++) {
    await playSingleSegment(segments[i], (segProgress) => {
      if (onProgress) {
        onProgress((i + segProgress) / total);
      }
    });
  }
  if (onProgress) onProgress(1);
}

export async function stopTts(): Promise<void> {
  await stopCurrent();
}

export function isPlaying(): boolean {
  return activeSound !== null;
}
