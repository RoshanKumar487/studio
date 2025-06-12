interface InvoiceCustomerDetailsProps {
  invoice: {
    billTo: string;
    billToAddress?: string;
    serviceProvider?: string;
    invoiceDate?: string;
    dueDate?: string;
  };
  displayServiceProvider?: boolean;
}

export function InvoiceCustomerDetails({ invoice, displayServiceProvider }: InvoiceCustomerDetailsProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between gap-4">
      <div>
        <h2 className="font-semibold mb-1">Bill To</h2>
        <div>{invoice.billTo}</div>
        {invoice.billToAddress && (
          <div className="text-sm text-muted-foreground whitespace-pre-line">{invoice.billToAddress}</div>
        )}
      </div>
      <div>
        <div>
          <span className="font-semibold">Invoice Date:</span>{' '}
          {invoice.invoiceDate ? invoice.invoiceDate : '--'}
        </div>
        <div>
          <span className="font-semibold">Due Date:</span>{' '}
          {invoice.dueDate ? invoice.dueDate : '--'}
        </div>
        {displayServiceProvider && invoice.serviceProvider && (
          <div>
            <span className="font-semibold">Service Provider:</span>{' '}
            {invoice.serviceProvider}
          </div>
        )}
      </div>
    </div>
  );
}