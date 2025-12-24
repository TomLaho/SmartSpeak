import * as React from 'react';
import { cn } from '@/lib/utils';

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { requiredMark?: boolean }
>(({ className, children, requiredMark, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
    {...props}
  >
    {children}
    {requiredMark && <span className="ml-1 text-destructive">*</span>}
  </label>
));
Label.displayName = 'Label';

export { Label };
