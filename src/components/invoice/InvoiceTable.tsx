interface InvoiceItem {
  id: string | number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}
interface InvoiceTableProps {
  invoice: { items: InvoiceItem[] };
  formatCurrency: (value: number) => string;
}

export function InvoiceTable({ invoice, formatCurrency }: InvoiceTableProps) {
  return (
    <div className="overflow-x-auto mt-4">
      <table className="min-w-full divide-y divide-gray-200 border">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left">Description</th>
            <th className="px-4 py-2 text-right">Quantity</th>
            <th className="px-4 py-2 text-right">Rate</th>
            <th className="px-4 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-2">{item.description}</td>
              <td className="px-4 py-2 text-right">{item.quantity}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(item.rate)}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}