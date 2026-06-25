import { MODULES } from '@/lib/exercises';
import ModulePage from './view';

// Static export: pre-render one page per learning module.
export function generateStaticParams() {
  return MODULES.map((m) => ({ id: m.id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <ModulePage params={params} />;
}
