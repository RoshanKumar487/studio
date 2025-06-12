import { Loader2 } from 'lucide-react';

export function InvoiceLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-96 animate-pulse">
      <Loader2 className="w-8 h-8 mb-4 animate-spin" />
      <div className="text-lg font-semibold">Loading invoice…</div>
    </div>
  );
}