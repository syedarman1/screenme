import { useEffect, useRef, useState } from "react";

export function useMediaRecorder(onData: (blob: Blob) => void) {
  // must provide a default value
  const [recording, setRecording] = useState<boolean>(false);
  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    let stream: MediaStream;

    if (!recording) return;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        stream = s;
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => onData(e.data);
        recorder.start(3000); // emit every 3s
        recorderRef.current = recorder;
      })
      .catch((err) => console.error("Mic error:", err));

    return () => {
      recorderRef.current?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [recording, onData]);

  return { recording, setRecording };
}
