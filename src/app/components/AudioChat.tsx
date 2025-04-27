// src/app/components/AudioChat.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import VideoFeed from "./VideoFeed"; // Assuming VideoFeed component exists and is correctly imported

// Define the shape of a chat message, including a unique ID
type ChatMsg = { id: number; who: "user" | "ai"; text: string };

export default function AudioChat() {
  // State variables
  const [msgs, setMsgs] = useState<ChatMsg[]>([]); // Stores the chat messages
  const [isRecording, setIsRecording] = useState(false); // Tracks if recording is active
  const [isProcessing, setIsProcessing] = useState(false); // Tracks if audio is being processed
  const [hasPermission, setHasPermission] = useState(false); // Tracks microphone permission status

  // Refs for media objects that don't need to trigger re-renders
  const mediaRef = useRef<MediaRecorder | null>(null); // Holds the MediaRecorder instance
  const chunksRef = useRef<Blob[]>([]); // Stores recorded audio chunks
  const streamRef = useRef<MediaStream | null>(null); // Holds the MediaStream from the microphone

  // --- Permission Handling ---
  const getMicrophonePermission = async (): Promise<boolean> => {
    // Check if MediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
       alert("Media Devices API not available in this browser.");
       setHasPermission(false);
       return false;
    }
    try {
      // Request audio stream - this prompts the user if permission isn't granted
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      // Release this test stream immediately as we only needed it for the permission check
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (err) {
      console.error("Microphone permission denied:", err);
      setHasPermission(false);
      // Inform the user how to potentially fix this
      alert(
        "Microphone access denied. Please enable microphone permissions for this site in your browser settings."
      );
      return false;
    }
  };

  // Optional: Check permission status silently on component mount
  useEffect(() => {
     const checkPermission = async () => {
         if (navigator.permissions) {
             try {
                 const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                 setHasPermission(permissionStatus.state === 'granted');
                 permissionStatus.onchange = () => {
                     setHasPermission(permissionStatus.state === 'granted');
                 };
             } catch (err) {
                 console.error("Error querying microphone permission:", err);
                 // If query fails, rely on explicit request later
                 setHasPermission(false);
             }
         } else {
            // Fallback if Permissions API is not supported
             console.warn("Permissions API not supported, will request permission on first use.");
             setHasPermission(false);
         }
     };
     checkPermission();
  }, []);


  // --- Recording Logic ---
  const start = async () => {
    // 1. Check/Request Permission FIRST
    let stream: MediaStream;
    if (!hasPermission) {
      const permitted = await getMicrophonePermission();
      if (!permitted) return; // Stop if permission was denied
    }

    // 2. Re-get the stream now that permission is confirmed
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch (err) {
      console.error("Failed to get media stream:", err);
      alert("Could not start recording. Please ensure your microphone is connected and enabled.");
      setHasPermission(false); // Reset permission status as stream failed
      return;
    }

    // 3. Cancel any ongoing Text-to-Speech
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    // 4. Setup MediaRecorder
    // Use a specific mimeType if needed and supported, otherwise let browser choose
    // const options = { mimeType: 'audio/webm;codecs=opus' };
    const recorder = new MediaRecorder(stream /*, options */);
    mediaRef.current = recorder;
    chunksRef.current = []; // Clear previous chunks

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    // --- onStop Handler (Called when recorder.stop() is executed) ---
    recorder.onstop = async () => {
      setIsRecording(false); // Update state: No longer recording
      setIsProcessing(true); // Update state: Now processing

      // Safety check for empty recording
      if (chunksRef.current.length === 0) {
        console.warn("No audio data recorded.");
        setMsgs((prev) => [
          ...prev,
          { id: Date.now(), who: "ai", text: "⚠️ No audio detected. Did you speak?" },
        ]);
        setIsProcessing(false); // Reset processing state
        // Clean up microphone tracks since we are not proceeding
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        return; // Exit the handler
      }

      // Create Blob and FormData
      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" }); // Ensure MIME type matches server expectation
      const formData = new FormData();
      formData.append("audio", audioBlob, "interview_audio.webm"); // Filename is helpful for server
      formData.append("history", JSON.stringify(msgs)); // Send current chat history

      // Optimistically add a placeholder message for the user's turn
      const placeholderId = Date.now();
      setMsgs((prev) => [...prev, { id: placeholderId, who: "user", text: "🎤 (Processing your answer…)" }]);

      // --- API Call ---
      try {
        const res = await fetch("/api/interviewConversation", {
          method: "POST",
          body: formData,
          // No 'Content-Type' header needed for FormData, browser sets it
        });

        // --- Handle API Response ---
        if (!res.ok) {
          // Attempt to parse error details from server response
          let errorDetails = `Server responded with status ${res.status}`;
          try {
             const errorData = await res.json();
             errorDetails = errorData.error || errorData.message || errorDetails;
          } catch (parseError) {
             // If JSON parsing fails, use the status text
             errorDetails = res.statusText || errorDetails;
          }
          console.error("API Error:", errorDetails);
          // Update the placeholder message to show the error
          setMsgs(prev => prev.map(msg =>
            msg.id === placeholderId
              ? { ...msg, text: `⚠️ Error: ${errorDetails}` }
              : msg
          ));
          // Optionally, add a separate AI message instead of replacing placeholder
          // setMsgs(prev => [...prev.filter(msg => msg.id !== placeholderId), { id: Date.now(), who: "ai", text: `⚠️ Error: ${errorDetails}` }]);
          throw new Error(errorDetails); // Propagate error to catch block for cleanup
        }

        // Successful response
        const data = (await res.json()) as {
          transcript: string;
          reply: string;
          // history might be returned but we handle updates client-side now
        };

        // 1. Update the placeholder with the actual transcript
        setMsgs(prev => prev.map(msg =>
          msg.id === placeholderId
            ? { ...msg, text: data.transcript || "[Transcription unavailable]" } // Handle potential empty transcript
            : msg
        ));

        // 2. Append the AI's reply as a new message
        setMsgs(prev => [
          ...prev,
          { id: Date.now() + 1, who: "ai", text: data.reply || "[AI response unavailable]" } // Handle potential empty reply
        ]);

        // 3. Speak the AI reply
        if (data.reply && 'speechSynthesis' in window) {
            const utter = new SpeechSynthesisUtterance(data.reply);
            const voices = window.speechSynthesis.getVoices();
            // Attempt to find a suitable female voice (browser-dependent)
            const femaleVoice = voices.find((v) => /female/i.test(v.name) && v.lang.startsWith('en'));
            if (femaleVoice) {
                utter.voice = femaleVoice;
            } else {
                console.warn("Female English voice not found, using default.");
            }
            window.speechSynthesis.speak(utter);
        }

      } catch (error) {
        // Handle network errors or errors thrown from response handling
        console.error("Error during API call or processing:", error);
        // Update placeholder if it hasn't been updated already by !res.ok check
         setMsgs(prev => prev.map(msg =>
             (msg.id === placeholderId && msg.text.includes("Processing")) // Check if it's still the placeholder
                 ? { ...msg, text: "⚠️ Network or processing error." }
                 : msg
         ));
         // Or add a separate AI error message
         // if (!msgs.some(m => m.id === placeholderId && m.text.startsWith('⚠️'))) {
         //     setMsgs(prev => [...prev.filter(msg => msg.id !== placeholderId), { id: Date.now(), who: "ai", text: "⚠️ Error: Could not connect or process request." }]);
         // }

      } finally {
        // --- Cleanup after API call (success or failure) ---
        streamRef.current?.getTracks().forEach((t) => t.stop()); // Stop mic tracks
        streamRef.current = null; // Clear the stream ref
        chunksRef.current = []; // Clear recorded chunks
        setIsProcessing(false); // Update state: No longer processing
      }
    }; // End of onstop handler

    // 5. Start the recorder
    recorder.start();
    setIsRecording(true); // Update state: Now recording
    setIsProcessing(false); // Ensure processing is false when starting
  }; // End of start function

  // --- Stop Function (Called by Stop Button) ---
  const stop = () => {
    // Check if recorder exists and is currently recording
    if (mediaRef.current && mediaRef.current.state === "recording") {
      mediaRef.current.stop(); // This will trigger the 'onstop' handler above
    } else {
      // Log if stop is called when not recording (e.g., during processing)
      console.log("Stop clicked but not actively recording.");
    }

    // Cancel any currently speaking TTS immediately
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    // Note: We don't set isRecording=false here; the onstop handler does it
    // to ensure state updates correctly relative to async operations.
  }; // End of stop function

  // --- Cleanup Effect (Runs on component unmount) ---
  useEffect(() => {
    return () => {
      // Stop any active media stream tracks
      streamRef.current?.getTracks().forEach((t) => t.stop());
      // Stop any active MediaRecorder
      if (mediaRef.current && mediaRef.current.state !== "inactive") {
          mediaRef.current.stop();
      }
      // Cancel any ongoing TTS
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []); // Empty dependency array ensures this runs only on unmount


  // --- Render JSX ---
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6 space-y-4">
      {/* Title */}
      <h3 className="text-lg font-semibold text-[var(--accent)]">
        Live Mock Interview
      </h3>

      {/* Main Content Area: Side-by-Side Layout */}
      <div className="flex flex-col md:flex-row gap-6">

        {/* Left Column: Video Feed and Controls */}
        <div className="w-full md:w-1/2 space-y-4">
          <VideoFeed />
          <div className="flex gap-4 items-center"> {/* Use items-center for vertical alignment */}
            <button
              onClick={start}
              disabled={isRecording || isProcessing || !hasPermission} // Disable if recording, processing, or no permission
              className="px-5 py-2 bg-[var(--accent)] text-[var(--background)] rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Start recording"
            >
              {isRecording ? "Recording..." : "Start Recording"}
            </button>
            <button
              onClick={stop}
              disabled={!isRecording} // Only disable if NOT recording
              className="px-5 py-2 bg-[var(--subtext)] text-[var(--background)] rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Stop recording"
            >
              Stop Recording
            </button>
             {/* Processing Indicator */}
             {isProcessing && (
                 <div className="text-sm text-[var(--subtext)] flex items-center gap-2">
                     <svg className="animate-spin h-4 w-4 text-[var(--subtext)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z"></path>
                     </svg>
                     Processing...
                 </div>
             )}
          </div>
          {!hasPermission && ( // Show permission reminder if needed
             <p className="text-xs text-[var(--subtext)]">Microphone permission required. Click "Start Recording" to request access.</p>
          )}
        </div>

        {/* Right Column: Transcript Display */}
        <div className="w-full md:w-1/2">
          <div className="h-64 max-h-64 overflow-y-auto space-y-2 border border-[var(--border)] rounded-lg p-3 bg-[var(--neutral-900)] text-sm"> {/* Adjusted styling */}
            {msgs.length === 0 && !isProcessing && (
              <p className="text-sm text-[var(--subtext)] italic text-center py-4">
                Click "Start Recording" to begin the interview...
              </p>
            )}
            {/* Render chat messages */}
            {msgs.map((m) => (
              <div
                key={m.id} // Use unique ID as key
                className={`p-1 ${ m.who === 'user' ? 'text-[var(--foreground)]' : 'text-[var(--accent)]'}`}
              >
                <strong>{m.who === "user" ? "You:" : "AI:"}</strong> {m.text}
              </div>
            ))}
          </div>
        </div>

      </div>{/* End Flex Container */}

    </div> // End Outer Card
  );
}