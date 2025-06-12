import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface InvoiceNotFoundProps {
  router: any; // Replace with NextRouter type if needed
}

export function InvoiceNotFound({ router }: InvoiceNotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center h-96">
      <h2 className="text-2xl font-bold mb-2">Invoice Not Found</h2>
      <p className="text-muted-foreground mb-4">The invoice you are looking for does not exist.</p>
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>
    </div>
  );
}