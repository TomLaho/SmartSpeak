import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NewRecordingForm } from '@/components/new-recording-form';
import { getCurrentUser } from '@/src/server/user';

export default async function NewRecordingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Upload or record</CardTitle>
          <CardDescription>Bring your latest rehearsal into SmartSpeak for instant analysis.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewRecordingForm />
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Pro tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Use a quiet space and keep the microphone 6-8 inches from your mouth.</p>
          <p>Upload MP4, MOV, MP3, or WAV recordings up to 200MB. Larger files may need compression.</p>
          <p>SmartSpeak automatically extracts audio and generates transcript-based metrics.</p>
        </CardContent>
      </Card>
    </div>
  );
}
