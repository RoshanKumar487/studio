
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppData } from '@/context/app-data-context';
import type { ExpenseEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { DatePicker } from '@/components/shared/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowUpDown, PlusCircle, Paperclip, Camera, Loader2, VideoOff, XCircle, FileWarning, Download, Image as ImageIcon, Eye, FileText, InfoIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import NextImage from 'next/image';

const expenseSchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  amount: z.coerce.number().min(0.01, "Amount must be positive."),
  category: z.string().min(1, "Category is required.").max(50, "Category too long."),
  description: z.string().max(200, "Description too long.").optional().or(z.literal('')), // Made optional
  submittedBy: z.string().max(100, "Submitter name too long.").optional().or(z.literal('')),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

type SortKey = keyof ExpenseEntry | '';
type SortDirection = 'asc' | 'desc';

const expenseCategories = ["Software", "Marketing", "Utilities", "Office Supplies", "Travel", "Meals", "Hardware", "Consulting", "Other"];

type HistoryAttachmentInfo = Pick<ExpenseEntry, 'documentFileName' | 'documentFileType' | 'documentFileSize'>;

export default function ExpensesPage() {
  const { expenseEntries, addExpenseEntry } = useAppData();
  const { toast } = useToast();

  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isViewAttachmentDialogOpen, setIsViewAttachmentDialogOpen] = useState(false);
  const [historyAttachmentToView, setHistoryAttachmentToView] = useState<HistoryAttachmentInfo | null>(null);
  const [isHistoryAttachmentDialogValidOpen, setIsHistoryAttachmentDialogValidOpen] = useState(false);


  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date(),
      amount: 0,
      category: '',
      description: '',
      submittedBy: '',
    },
  });

   useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      stopCameraStream();
    };
  }, [imagePreviewUrl]);

  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    stopCameraStream();
    setIsCameraMode(true);
    setHasCameraPermission(null);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setHasCameraPermission(true);
      } catch (err) {
        console.error("Error accessing camera:", err);
        setHasCameraPermission(false);
        toast({ variant: "destructive", title: "Camera Access Denied", description: "Please enable camera permissions." });
        setIsCameraMode(false);
      }
    } else {
      setHasCameraPermission(false);
      toast({ variant: "destructive", title: "Camera Not Supported" });
      setIsCameraMode(false);
    }
  };

  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current && hasCameraPermission) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `expense-capture-${Date.now()}.png`;
          const capturedFile = new File([blob], fileName, { type: 'image/png' });
          setSelectedFile(capturedFile);
          if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
          setImagePreviewUrl(URL.createObjectURL(capturedFile));
        }
      }, 'image/png');
      stopCameraStream();
      setIsCameraMode(false);
      toast({ title: "Photo Captured", description: "Receipt image captured." });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    stopCameraStream();
    setIsCameraMode(false);
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) setImagePreviewUrl(URL.createObjectURL(file));
      else setImagePreviewUrl(null);
    } else {
      setSelectedFile(null);
      setImagePreviewUrl(null);
    }
  };
  
  const handleDownloadSelectedFile = () => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const onSubmit: SubmitHandler<ExpenseFormData> = (data) => {
    const expensePayload: Partial<ExpenseEntry> = { ...data };
    if (selectedFile) {
      expensePayload.documentFileName = selectedFile.name;
      expensePayload.documentFileType = selectedFile.type;
      expensePayload.documentFileSize = selectedFile.size;
    }

    addExpenseEntry(expensePayload as Omit<ExpenseEntry, 'id' | 'date'> & { date: Date });
    toast({
      title: "Expense Added",
      description: `Successfully added expense for ${data.category}.`,
    });
    form.reset({ date: new Date(), amount: 0, category: '', description: '', submittedBy: '' });
    setSelectedFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = ""; 
    setIsCameraMode(false);
    stopCameraStream();
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedExpenseEntries = useMemo(() => {
    if (!sortKey) return expenseEntries;
    return [...expenseEntries].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];
      
      if (valA === undefined || valB === undefined) return 0;

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (valA instanceof Date && valB instanceof Date) {
        comparison = valA.getTime() - valB.getTime();
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [expenseEntries, sortKey, sortDirection]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return "N/A";
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleViewHistoryAttachment = (entry: ExpenseEntry) => {
    if (entry.documentFileName) {
      setHistoryAttachmentToView({
        documentFileName: entry.documentFileName,
        documentFileType: entry.documentFileType,
        documentFileSize: entry.documentFileSize,
      });
      setIsHistoryAttachmentDialogValidOpen(true);
    }
  };


  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline tracking-tight">Expense Management</h1>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><PlusCircle className="mr-2 h-6 w-6 text-primary" /> Add New Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date <span className="text-destructive">*</span></FormLabel>
                      <DatePicker date={field.value} setDate={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Amount <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {expenseCategories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Monthly software subscription" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="submittedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Submitted By (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Attach Receipt/Document (Optional)</FormLabel>
                {!isCameraMode && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FormControl className="flex-grow min-w-0">
                        <Input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleFileChange} 
                          className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        />
                      </FormControl>
                      <Button type="button" variant="outline" onClick={startCamera} className="shrink-0" size="default"> {/* Changed size to default */}
                        <Camera className="mr-2 h-4 w-4" /> Capture
                      </Button>
                    </div>
                    {selectedFile && (
                      <div className="flex items-center justify-between gap-2 rounded-md border p-2 bg-muted/50">
                        <FormDescription className="flex items-center gap-1.5 text-xs truncate">
                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate" title={selectedFile.name}>
                            {selectedFile.name} ({formatFileSize(selectedFile.size)})
                          </span>
                        </FormDescription>
                        <div className="flex gap-1 shrink-0">
                            {imagePreviewUrl && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => setIsViewAttachmentDialogOpen(true)} className="text-xs h-auto py-1 px-2">
                                    <Eye className="mr-1 h-3.5 w-3.5" /> View
                                </Button>
                            )}
                            <Button type="button" variant="ghost" size="sm" onClick={handleDownloadSelectedFile} className="text-xs h-auto py-1 px-2">
                                <Download className="mr-1 h-3.5 w-3.5" /> Download
                            </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </FormItem>
              
              {isCameraMode && (
                <Card className="p-4 space-y-3 border-dashed">
                  <CardTitle className="text-base font-semibold">Camera Capture</CardTitle>
                  <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                    {hasCameraPermission === false && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4">
                            <VideoOff className="h-10 w-10 mb-2"/>
                            <p className="text-center font-semibold">Camera Access Denied</p>
                            <p className="text-xs text-center">Please enable permissions.</p>
                        </div>
                    )}
                     {hasCameraPermission === null && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4">
                            <Loader2 className="h-10 w-10 mb-2 animate-spin"/>
                            <p>Accessing camera...</p>
                        </div>
                    )}
                  </div>
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  <div className="flex gap-2">
                    <Button type="button" onClick={handleCapturePhoto} disabled={!hasCameraPermission} size="sm">
                      <Camera className="mr-2 h-4 w-4" /> Capture Photo
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setIsCameraMode(false); stopCameraStream(); }} size="sm">
                      <XCircle className="mr-2 h-4 w-4" /> Cancel Camera
                    </Button>
                  </div>
                   {selectedFile && isCameraMode && ( 
                        <FormDescription className="flex items-center gap-1 pt-1 text-xs">
                            <Paperclip className="h-3 w-3 text-muted-foreground" /> Captured: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                        </FormDescription>
                    )}
                </Card>
              )}

              {imagePreviewUrl && selectedFile && selectedFile.type.startsWith('image/') && !isCameraMode && (
                <div className="my-2 p-2 border rounded-md max-w-xs">
                  <FormLabel className="text-xs">Preview:</FormLabel>
                  <NextImage src={imagePreviewUrl} alt="Selected image preview" width={150} height={150} className="mt-1 rounded-md object-contain max-h-36 w-auto" />
                </div>
              )}
              {selectedFile && !selectedFile.type.startsWith('image/') && !imagePreviewUrl && !isCameraMode && (
                 <div className="my-2 p-2 border rounded-md bg-muted/50 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <FileWarning className="h-4 w-4 text-amber-500" />
                        <span>No preview for {selectedFile.type}.</span>
                    </div>
                </div>
              )}

              <Button type="submit" className="w-full md:w-auto">Add Expense</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Expense History</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedExpenseEntries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('date')} className="cursor-pointer hover:bg-muted/80">
                     <div className="flex items-center">Date <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('category')} className="cursor-pointer hover:bg-muted/80">
                     <div className="flex items-center">Category <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('description')} className="cursor-pointer hover:bg-muted/80">
                     <div className="flex items-center">Description <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('submittedBy')} className="cursor-pointer hover:bg-muted/80">
                     <div className="flex items-center">Submitted By <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                   <TableHead className="text-center">Attachment</TableHead>
                  <TableHead onClick={() => handleSort('amount')} className="text-right cursor-pointer hover:bg-muted/80">
                     <div className="flex items-center justify-end">Amount <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedExpenseEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(entry.date, "PPP")}</TableCell>
                    <TableCell>{entry.category}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>{entry.submittedBy || <span className="text-xs text-muted-foreground italic">N/A</span>}</TableCell>
                    <TableCell className="text-center">
                      {entry.documentFileName ? (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={() => handleViewHistoryAttachment(entry)}
                          aria-label="View attachment metadata"
                        >
                          <FileText className="h-4 w-4 text-primary" title={entry.documentFileName} />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No expense entries yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Dialog for viewing currently selected/captured image in the form */}
      <Dialog open={isViewAttachmentDialogOpen} onOpenChange={setIsViewAttachmentDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Attachment Preview: {selectedFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {imagePreviewUrl && (
              <NextImage 
                src={imagePreviewUrl} 
                alt={selectedFile?.name || "Attachment preview"} 
                width={800} 
                height={600} 
                className="rounded-md object-contain max-h-[70vh] w-auto mx-auto" 
              />
            )}
            {!imagePreviewUrl && selectedFile && (
                <Alert>
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>Cannot Preview File</AlertTitle>
                    <AlertDescription>
                        Preview is only available for image files. File type: {selectedFile.type}.
                        You can download it to view.
                    </AlertDescription>
                </Alert>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for viewing attachment metadata from history */}
      <Dialog open={isHistoryAttachmentDialogValidOpen} onOpenChange={setIsHistoryAttachmentDialogValidOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Document Metadata: {historyAttachmentToView?.documentFileName}</DialogTitle>
          </DialogHeader>
          {historyAttachmentToView && (
            <div className="space-y-3 py-4">
              <p><span className="font-semibold">File Name:</span> {historyAttachmentToView.documentFileName}</p>
              <p><span className="font-semibold">File Type:</span> {historyAttachmentToView.documentFileType || "N/A"}</p>
              <p><span className="font-semibold">File Size:</span> {formatFileSize(historyAttachmentToView.documentFileSize)}</p>
              
              <Alert variant="default" className="mt-6 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                <InfoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-700 dark:text-blue-300">Important Note on File Storage</AlertTitle>
                <AlertDescription className="text-xs text-blue-600 dark:text-blue-400">
                  This application demo stores document metadata (like name, type, and size) only. 
                  Actual file content is not uploaded to or stored on any server. 
                  Therefore, direct viewing, printing, or downloading of previously "attached" files from history is not possible.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryAttachmentDialogValidOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}


    