import { Audio } from "expo-av";
import { getBaseUrl } from "./api";

const TRANSCRIBE_TIMEOUT_MS = 120_000;

export type TranscribeResult = {
  text: string;
  language: string | null;
};

export async function requestMicPermission(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
  return granted;
}

let activeRecording: Audio.Recording | null = null;

export async function startRecording(): Promise<void> {
  if (activeRecording) {
    try {
      await activeRecording.stopAndUnloadAsync();
    } catch {}
    activeRecording = null;
  }

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
  } catch (e) {
    console.warn("[STT] Failed to set audio mode for recording:", e);
    await new Promise((r) => setTimeout(r, 300));
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
  }

  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY,
  );
  activeRecording = recording;
}

export async function stopAndTranscribe(): Promise<TranscribeResult> {
  if (!activeRecording) {
    console.warn("[STT] stopAndTranscribe called but no active recording");
    return { text: "", language: null };
  }

  const rec = activeRecording;
  activeRecording = null;

  await rec.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

  const uri = rec.getURI();
  if (!uri) return { text: "", language: null };

  const ext = uri.split(".").pop() || "m4a";
  const mimeMap: Record<string, string> = {
    m4a: "audio/m4a",
    caf: "audio/x-caf",
    "3gp": "audio/3gpp",
    mp4: "audio/mp4",
    wav: "audio/wav",
    webm: "audio/webm",
  };

  const formData = new FormData();
  formData.append("file", {
    uri,
    name: `speech.${ext}`,
    type: mimeMap[ext] || "application/octet-stream",
  } as any);

  const base = getBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);

  try {
    console.log(`[STT] Uploading audio to ${base}/transcribe (ext=${ext})`);
    const res = await fetch(`${base}/transcribe`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail || "Transcription failed");
      console.warn(`[STT] Server error ${res.status}: ${msg}`);
      throw new Error(msg);
    }

    const text = (data.text || "").trim();
    console.log(`[STT] Transcribed: "${text.slice(0, 80)}"`);
    return {
      text,
      language: data.language || null,
    };
  } catch (e: any) {
    if (e.name === "AbortError") {
      throw new Error("Transcription timed out. Keep clips under ~30 s.");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export async function cancelRecording(): Promise<void> {
  if (!activeRecording) return;
  try {
    await activeRecording.stopAndUnloadAsync();
  } catch {}
  activeRecording = null;
  try {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  } catch {}
}
