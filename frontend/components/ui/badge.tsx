import type { HTMLAttributes } from "react";

const Badge = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={`inline-flex items-center rounded-full border border-transparent bg-primary/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary ${className ?? ""}`}
    {...props}
  />
);

export { Badge };
