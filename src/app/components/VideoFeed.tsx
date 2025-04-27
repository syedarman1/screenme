import { useEffect, useRef } from "react";

export default function VideoFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error("Webcam error:", err));
  }, []);

  return (
    <div className="mb-4">
      <video
        ref={videoRef}
        autoPlay
        muted
        className="w-full rounded-lg border border-[var(--border)]"
      />
    </div>
  );
}
