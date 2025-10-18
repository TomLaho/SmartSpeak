'use client';

import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

interface ShareButtonProps {
  recordingId: string;
}

export function ShareButton({ recordingId }: ShareButtonProps) {
  async function handleShare() {
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingId })
      });
      if (!response.ok) throw new Error('Unable to create share link');
      const { token } = await response.json();
      const url = `${window.location.origin}/share/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied to clipboard');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate share link');
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleShare}>
      <Share2 className="mr-2 h-4 w-4" /> Share link
    </Button>
  );
}
