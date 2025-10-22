import Link from "next/link";
import { Button } from "../components/ui/button";

import { ErrorBoundary } from "@/app/_components/ErrorBoundary";
import { SpeechAnalyzer } from "@/app/_components/SpeechAnalyzer";

export default function HomePage() {
  return (
    <ErrorBoundary resetKey="speech-analyzer">
      <SpeechAnalyzer />
    </ErrorBoundary>
  );
}
