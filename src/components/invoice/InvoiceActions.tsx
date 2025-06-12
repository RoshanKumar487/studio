import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';

interface InvoiceActionsProps {
  invoice: { status: string };
  handleStatusChange: (status: string) => void;
  handlePrint: () => void;
  router: any; // Replace with NextRouter type if using Next.js
}

export function InvoiceActions({
  invoice,
  handleStatusChange,
  handlePrint,
  router,
}: InvoiceActionsProps) {
  return (
    <div className="flex items-center justify-between mb-4 print:hidden">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>
      <div className="flex gap-2">
        {/* Example: Status dropdown */}
        <select
          value={invoice.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="border rounded p-2"
        >
          <option value="Draft">Draft</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
        </select>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
      </div>
    </div>
  );
}