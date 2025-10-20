import * as React from "react";

type TableProps = React.HTMLAttributes<HTMLTableElement>;

const Table = React.forwardRef<HTMLTableElement, TableProps>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={`w-full caption-bottom text-sm ${className ?? ""}`}
    {...props}
  />
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={`[&_tr]:border-b ${className ?? ""}`} {...props} />
  ),
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={`[&_tr:last-child]:border-0 ${className ?? ""}`} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={`border-b transition-colors hover:bg-muted/50 ${className ?? ""}`} {...props} />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={`h-10 px-2 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide ${className ?? ""}`}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={`p-2 align-middle text-sm ${className ?? ""}`} {...props} />
  ),
);
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
