import { EXERCISES, FREE_PLAY_ID } from '@/lib/exercises';
import ExercisePlayer from './player';

// Static export: pre-render every curriculum exercise plus the Open Mic free-play.
export function generateStaticParams() {
  return [...EXERCISES.map((e) => ({ id: e.id })), { id: FREE_PLAY_ID }];
}

export default function Page({ params }: { params: { id: string } }) {
  return <ExercisePlayer params={params} />;
}
