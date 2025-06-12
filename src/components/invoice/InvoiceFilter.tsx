'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InvoiceFilterProps {
  filter: string;
  setFilter: (value: string) => void;
}

export function InvoiceFilter({ filter, setFilter }: InvoiceFilterProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <label htmlFor="invoice-status" className="font-medium text-sm text-muted-foreground">
        Filter by Status:
      </label>
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger id="invoice-status" className="w-40">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All</SelectItem>
          <SelectItem value="Draft">Draft</SelectItem>
          <SelectItem value="Sent">Sent</SelectItem>
          <SelectItem value="Paid">Paid</SelectItem>
          <SelectItem value="Overdue">Overdue</SelectItem>
          <SelectItem value="Unpaid">Unpaid</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}