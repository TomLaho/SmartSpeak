import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, options, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      className
    )}
    {...props}
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value} className="bg-background text-foreground">
        {opt.label}
      </option>
    ))}
  </select>
));
Select.displayName = 'Select';
