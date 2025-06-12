interface InvoiceSummaryProps {
  invoice: {
    subTotal: number;
    tax?: number;
    total: number;
  };
  formatCurrency: (value: number) => string;
}

export function InvoiceSummary({ invoice, formatCurrency }: InvoiceSummaryProps) {
  return (
    <div className="flex flex-col items-end mt-4">
      <div className="flex gap-4">
        <div className="text-right">
          <div>Subtotal:</div>
          {invoice.tax !== undefined && <div>Tax:</div>}
          <div className="font-bold">Total:</div>
        </div>
        <div className="text-right">
          <div>{formatCurrency(invoice.subTotal)}</div>
          {invoice.tax !== undefined && <div>{formatCurrency(invoice.tax)}</div>}
          <div className="font-bold">{formatCurrency(invoice.total)}</div>
        </div>
      </div>
    </div>
  );
}