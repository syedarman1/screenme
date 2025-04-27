export function speak(text: string) {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utt = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utt);
    }
  }
  