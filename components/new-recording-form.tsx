'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

export function NewRecordingForm() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get('file');
    if (!(file instanceof File)) {
      toast.error('Select a recording to upload');
      return;
    }

    setIsUploading(true);
    setProgress(10);

    try {
      const response = await fetch('/api/recordings', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Upload failed');
      }

      setProgress(80);
      const { recording } = await response.json();
      toast.success('Upload complete! Running analysis...');

      const analysis = await fetch(`/api/recordings/${recording.id}/analyze`, { method: 'POST' });
      if (!analysis.ok) {
        throw new Error('Analysis failed');
      }
      setProgress(100);
      router.push(`/app/recordings/${recording.id}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
      <div className="space-y-2">
        <Label htmlFor="title">Session title</Label>
        <Input id="title" name="title" placeholder="Team update rehearsal" required maxLength={80} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="file">Upload file</Label>
        <Input id="file" name="file" type="file" accept="audio/*,video/*" required />
        <p className="text-xs text-muted-foreground">MP4, MOV, MP3, or WAV up to 200MB.</p>
      </div>
      {isUploading && <Progress value={progress} />}
      <Button type="submit" disabled={isUploading}>
        {isUploading ? 'Uploading…' : 'Upload and analyze'}
      </Button>
    </form>
  );
}
