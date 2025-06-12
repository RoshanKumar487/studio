'use client';
import { InvoiceFilter } from '@/components/invoice/InvoiceFilter';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
const [filter, setFilter] = useState("");
import {
  InvoiceHeader,
  InvoiceCustomerDetails,
  InvoiceTable,
  InvoiceSummary,
  InvoiceNotes,
  InvoiceActions,
  InvoiceNotFound,
  InvoiceLoading,
} from '@/components/invoice';


type InvoiceItem = {
  id: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

type Invoice = {
  companyName: string;
  companyAddress: string;
  invoiceNumber: string;
  status: string;
  billTo: string;
  billToAddress: string;
  serviceProvider: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subTotal: number;
  tax: number;
  total: number;
  notes: string;
};



export default function InvoicePage() {
  const [invoice, setInvoice] = useState<Invoice | undefined>();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  

  // Mock fetch - replace with your real data fetching logic
  useEffect(() => {
    setTimeout(() => {
      setInvoice({
        companyName: 'Acme Corp',
        companyAddress: '123 Main St\nCity, Country',
        invoiceNumber: 'INV-0001',
        status: 'Unpaid',
        billTo: 'John Doe',
        billToAddress: '456 Other St\nTown, Country',
        serviceProvider: 'Jane Smith',
        invoiceDate: '2024-06-15',
        dueDate: '2024-07-15',
        items: [
          { id: 1, description: 'Design work', quantity: 10, rate: 50, amount: 500 },
          { id: 2, description: 'Development', quantity: 20, rate: 75, amount: 1500 },
        ],
        subTotal: 2000,
        tax: 200,
        total: 2200,
        notes: 'Thank you for your business!',
      });
      setLoading(false);
    }, 1000);
  }, []);

  const formatCurrency = (val: number) => `$${val.toFixed(2)}`;
  const handleStatusChange = (status: string) =>
    setInvoice((inv) => (inv ? { ...inv, status } : undefined));
  const handlePrint = () => window.print();

  if (loading) return <InvoiceLoading />;
  if (!invoice) return <InvoiceNotFound router={router} />;

  return (
  <div className="max-w-3xl mx-auto p-4">
  <InvoiceFilter filter={filter} setFilter={setFilter} />

  <InvoiceActions
    invoice={invoice}
    handleStatusChange={handleStatusChange}
    handlePrint={handlePrint}
    router={router}
  />
  <div className="bg-white rounded-lg shadow p-6 print:p-0">
    <InvoiceHeader invoice={invoice} />
    <div className="mt-4">
      <InvoiceCustomerDetails invoice={invoice} displayServiceProvider />
    </div>
    <InvoiceTable invoice={invoice} formatCurrency={formatCurrency} />
    <InvoiceSummary invoice={invoice} formatCurrency={formatCurrency} />
    <InvoiceNotes notes={invoice.notes} />
  </div>
</div>
  );
}