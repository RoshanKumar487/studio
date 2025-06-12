import { CardHeader } from '@/components/ui/card';
import { AppLogo } from '@/components/shared/app-logo';

interface InvoiceHeaderProps {
  invoice: {
    companyName: string;
    companyAddress?: string;
    invoiceNumber: string;
    status: string;
  };
}

export function InvoiceHeader({ invoice }: InvoiceHeaderProps) {
  return (
    <CardHeader className="border-b print:border-b pb-4">
      <div className="flex justify-between items-start">
        <div>
          <AppLogo size="default" />
          <p className="text-lg font-semibold mt-1">{invoice.companyName}</p>
          {invoice.companyAddress && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {invoice.companyAddress}
            </p>
          )}
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-bold text-primary font-headline tracking-tight mb-1">
            {invoice.invoiceNumber}
          </h1>
          <p className="text-muted-foreground">
            Status:{' '}
            <span
              className={`font-semibold ${
                invoice.status === 'Paid'
                  ? 'text-green-600'
                  : invoice.status === 'Overdue'
                  ? 'text-red-600'
                  : 'text-foreground'
              }`}
            >
              {invoice.status}
            </span>
          </p>
        </div>
      </div>
    </CardHeader>
  );
}