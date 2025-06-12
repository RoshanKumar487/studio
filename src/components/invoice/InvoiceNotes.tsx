interface InvoiceNotesProps {
  notes?: string;
}

export function InvoiceNotes({ notes }: InvoiceNotesProps) {
  if (!notes) return null;
  return (
    <div className="mt-6 border-t pt-4 text-muted-foreground text-sm">
      <span className="font-semibold">Notes:</span>
      <div className="whitespace-pre-line">{notes}</div>
    </div>
  );
}