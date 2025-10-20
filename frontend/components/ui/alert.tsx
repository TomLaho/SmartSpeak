import * as React from "react";

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "destructive";
};

const variantStyles: Record<NonNullable<AlertProps["variant"]>, string> = {
  default: "bg-muted text-foreground",
  destructive: "border-destructive/50 text-destructive",
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={`relative w-full rounded-lg border border-border p-4 ${variantStyles[variant]} ${className ?? ""}`}
    {...props}
  />
));
Alert.displayName = "Alert";

export { Alert };
