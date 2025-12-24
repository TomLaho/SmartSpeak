import * as React from 'react';
import { cn } from '@/lib/utils';

const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full border bg-muted', className)}
    {...props}
  >
    {children}
  </div>
));
Avatar.displayName = 'Avatar';

const AvatarImage = ({ src, alt }: { src?: string; alt?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src || ''} alt={alt || 'avatar'} className="h-full w-full object-cover" />
);

const AvatarFallback = ({ children }: { children?: React.ReactNode }) => (
  <span className="flex h-full w-full items-center justify-center bg-muted text-sm font-semibold text-muted-foreground">
    {children}
  </span>
);

export { Avatar, AvatarImage, AvatarFallback };
