
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppData } from '@/context/app-data-context';
import type { Employee, EmployeeDocument } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from '@/components/shared/date-picker';
import { Users, PlusCircle, FileText, Trash2, Eye, FileUp, InfoIcon, Download, Image as ImageIcon, FileWarning, Loader2, Camera, XCircle, VideoOff } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import NextImage from 'next/image'; // Renamed to avoid conflict with Lucide's Image


const employmentTypes = ['Full-time', 'Part-time', 'Contract'] as const;

const employeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(100),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  jobTitle: z.string().max(100, "Job title too long.").optional().or(z.literal('')),
  startDate: z.date().nullable().optional(),
  employmentType: z.enum(employmentTypes).optional(),
  actualSalary: z.coerce.number().min(0, "Salary must be non-negative").nullable().optional(),
});
type EmployeeFormData = z.infer<typeof employeeSchema>;

const documentSchema = z.object({
  name: z.string().min(1, "Document name is required.").max(100),
  description: z.string().max(200).optional(),
});
type DocumentFormData = z.infer<typeof documentSchema>;

export default function HrPage() {
  const { employees, addEmployee, addEmployeeDocument, getEmployeeById, deleteEmployeeDocument, loadingEmployees } = useAppData();
  const { toast } = useToast();
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [isDocumentDialogMainOpen, setIsDocumentDialogMainOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  const [isPreviewDocumentDialogOpen, setIsPreviewDocumentDialogOpen] = useState(false);
  const [documentToPreview, setDocumentToPreview] = useState<EmployeeDocument | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<{ empId: string, docId: string, docName: string } | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [isCameraMode, setIsCameraMode] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);


  const employeeForm = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: '', email: '', jobTitle: '', startDate: null, employmentType: undefined, actualSalary: null },
  });

  const documentForm = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: { name: '', description: '' },
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
    stopCameraStream(); // Ensure any existing stream is stopped
    setIsCameraMode(true);
    setHasCameraPermission(null); // Reset permission status
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);
      } catch (err) {
        console.error("Error accessing camera:", err);
        setHasCameraPermission(false);
        toast({
          variant: "destructive",
          title: "Camera Access Denied",
          description: "Please enable camera permissions in your browser settings to use this feature.",
        });
        setIsCameraMode(false);
      }
    } else {
      setHasCameraPermission(false);
      toast({ variant: "destructive", title: "Camera Not Supported", description: "Your browser does not support camera access." });
      setIsCameraMode(false);
    }
  };

  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current && hasCameraPermission) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `capture-${Date.now()}.png`;
          const capturedFile = new File([blob], fileName, { type: 'image/png' });
          setSelectedFile(capturedFile);
          documentForm.setValue("name", fileName.split('.').slice(0, -1).join('.') || fileName);

          if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
          const newPreviewUrl = URL.createObjectURL(capturedFile);
          setImagePreviewUrl(newPreviewUrl);
        }
      }, 'image/png');
      
      stopCameraStream();
      setIsCameraMode(false);
      toast({ title: "Photo Captured", description: "Image captured and ready for document record." });
    }
  };


  const onEmployeeSubmit: SubmitHandler<EmployeeFormData> = async (data) => {
    try {
        const newEmployee = await addEmployee({
          ...data,
          actualSalary: data.actualSalary === null ? undefined : data.actualSalary, // API expects number or undefined
        });
        if (newEmployee) {
        toast({ title: "Employee Added", description: `${data.name} has been added.` });
        employeeForm.reset({ name: '', email: '', jobTitle: '', startDate: null, employmentType: undefined, actualSalary: null });
        setIsEmployeeFormOpen(false);
        } else {
        toast({ title: "Error", description: `Failed to add employee ${data.name}.`, variant: "destructive" });
        }
    } catch (error: any) {
        toast({ title: "Error Adding Employee", description: error.message || `Failed to add employee ${data.name}.`, variant: "destructive" });
    }
  };

  const onDocumentSubmit: SubmitHandler<DocumentFormData> = async (data) => {
    if (selectedEmployee) {
      const documentData: Partial<Omit<EmployeeDocument, 'id' | 'uploadedAt'>> = { ...data };
      if (selectedFile) {
        documentData.fileName = selectedFile.name;
        documentData.fileType = selectedFile.type;
        documentData.fileSize = selectedFile.size;
      }
      try {
        await addEmployeeDocument(selectedEmployee.id, documentData as Omit<EmployeeDocument, 'id' | 'uploadedAt'>);
        toast({ title: "Document Record Added", description: `Document '${data.name}' added for ${selectedEmployee.name}.` });
        documentForm.reset();
        setSelectedFile(null);
        if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl);
            setImagePreviewUrl(null);
        }
        setIsCameraMode(false);
        stopCameraStream();
        const updatedEmployee = await getEmployeeById(selectedEmployee.id); 
        setSelectedEmployee(updatedEmployee || null);
      } catch (error: any) {
        toast({ title: "Error Adding Document", description: error.message || "Failed to add document record.", variant: "destructive" });
      }
    }
  };

  const openDocumentDialog = async (employeeId: string) => {
    try {
        const employee = await getEmployeeById(employeeId);
        if (employee) {
            setSelectedEmployee(employee);
            documentForm.reset(); 
            setSelectedFile(null);
            if (imagePreviewUrl) {
                URL.revokeObjectURL(imagePreviewUrl);
                setImagePreviewUrl(null);
            }
            setIsCameraMode(false);
            stopCameraStream();
            setIsDocumentDialogMainOpen(true);
        } else {
            toast({title: "Error", description: "Could not load employee data.", variant: "destructive"});
        }
    } catch (error: any) {
        toast({title: "Error Loading Employee", description: error.message || "Could not load employee data.", variant: "destructive"});
    }
  };

  const handleOpenPreviewDialog = (doc: EmployeeDocument) => {
    setDocumentToPreview(doc);
    setIsPreviewDocumentDialogOpen(true);
  };

  const handleDeleteDocument = async () => {
    if (documentToDelete && selectedEmployee) {
      try {
        await deleteEmployeeDocument(documentToDelete.empId, documentToDelete.docId);
        toast({ title: "Document Deleted", description: `Document '${documentToDelete.docName}' has been deleted.` });
        const updatedEmployee = await getEmployeeById(selectedEmployee.id); 
        setSelectedEmployee(updatedEmployee || null);
        setDocumentToDelete(null); 
      } catch (error: any) {
        toast({ title: "Error Deleting Document", description: error.message || "Failed to delete document.", variant: "destructive" });
      }
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    stopCameraStream();
    setIsCameraMode(false);
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      documentForm.setValue("name", file.name.split('.').slice(0, -1).join('.') || file.name);
      if (file.type.startsWith('image/')) {
        setImagePreviewUrl(URL.createObjectURL(file));
      }
    } else {
      setSelectedFile(null);
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

  const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined || bytes === null) return "N/A";
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center">
          <Users className="mr-3 h-8 w-8 text-primary" /> HR & Employee Management
        </h1>
        <Dialog open={isEmployeeFormOpen} onOpenChange={setIsEmployeeFormOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-5 w-5" /> Add Employee Manually</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle className="font-headline">New Employee</DialogTitle></DialogHeader>
            <Form {...employeeForm}>
              <form onSubmit={employeeForm.handleSubmit(onEmployeeSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
                <FormField control={employeeForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={employeeForm.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="e.g., jane.doe@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={employeeForm.control} name="jobTitle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl><Input placeholder="e.g., Software Engineer" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={employeeForm.control} name="startDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <DatePicker date={field.value || undefined} setDate={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={employeeForm.control} name="employmentType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} >
                      <FormControl><SelectTrigger><SelectValue placeholder="Select employment type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {employmentTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={employeeForm.control} name="actualSalary" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Monthly Salary (USD)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 5000" {...field} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit">Add Employee</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Employee List</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEmployees && <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading employees...</span></div>}
          {!loadingEmployees && employees.length === 0 && (
            <p className="text-muted-foreground text-center py-4">No employees added yet.</p>
          )}
          {!loadingEmployees && employees.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead className="text-center">Docs</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.jobTitle || 'N/A'}</TableCell>
                    <TableCell>{employee.startDate ? format(new Date(employee.startDate), "PPP") : 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(employee.actualSalary)}</TableCell>
                    <TableCell className="text-center">{employee.documents.length}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openDocumentDialog(employee.id)}>
                        <FileText className="mr-2 h-4 w-4" /> Manage Docs
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDocumentDialogMainOpen} onOpenChange={(isOpen) => {
        setIsDocumentDialogMainOpen(isOpen);
        if (!isOpen) {
            setSelectedEmployee(null);
            setSelectedFile(null);
             if (imagePreviewUrl) {
                URL.revokeObjectURL(imagePreviewUrl);
                setImagePreviewUrl(null);
            }
            stopCameraStream();
            setIsCameraMode(false);
        }
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline">Manage Documents for {selectedEmployee?.name}</DialogTitle>
            <CardDescription>Add new document records. Metadata is stored in MongoDB. File content is not uploaded to cloud storage in this demo.</CardDescription>
          </DialogHeader>
          
          <Card>
            <CardHeader><CardTitle className="text-lg font-semibold">Add New Document Record</CardTitle></CardHeader>
            <CardContent>
              <Form {...documentForm}>
                <form onSubmit={documentForm.handleSubmit(onDocumentSubmit)} className="space-y-4">
                  <FormField control={documentForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Name / Title</FormLabel>
                      <FormControl><Input placeholder="e.g., Passport, Contract, ID Photo" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={documentForm.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl><Textarea placeholder="Brief description or notes about the document" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  {!isCameraMode && (
                    <FormItem>
                      <FormLabel>Attach File</FormLabel>
                      <FormControl>
                        <Input 
                          type="file" 
                          onChange={handleFileChange} 
                          className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        />
                      </FormControl>
                      {selectedFile && (
                          <FormDescription className="flex items-center gap-1 pt-1">
                              <FileUp className="h-4 w-4 text-muted-foreground" /> Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)}) - Type: {selectedFile.type}
                          </FormDescription>
                      )}
                    </FormItem>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {!isCameraMode && (
                        <Button type="button" variant="outline" onClick={startCamera}>
                            <Camera className="mr-2 h-4 w-4" /> Capture from Camera
                        </Button>
                    )}
                  </div>
                  
                  {isCameraMode && (
                    <Card className="p-4 space-y-3">
                      <CardTitle className="text-base">Camera Capture</CardTitle>
                      <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                        {hasCameraPermission === false && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4">
                                <VideoOff className="h-12 w-12 mb-2"/>
                                <p className="text-center font-semibold">Camera Access Denied</p>
                                <p className="text-xs text-center">Please enable camera permissions in your browser settings.</p>
                            </div>
                        )}
                         {hasCameraPermission === null && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4">
                                <Loader2 className="h-12 w-12 mb-2 animate-spin"/>
                                <p>Accessing camera...</p>
                            </div>
                        )}
                      </div>
                      <canvas ref={canvasRef} className="hidden"></canvas>
                      <div className="flex gap-2">
                        <Button type="button" onClick={handleCapturePhoto} disabled={!hasCameraPermission}>
                          <Camera className="mr-2 h-4 w-4" /> Capture Photo
                        </Button>
                        <Button type="button" variant="outline" onClick={() => { setIsCameraMode(false); stopCameraStream(); }}>
                          <XCircle className="mr-2 h-4 w-4" /> Cancel Camera
                        </Button>
                      </div>
                    </Card>
                  )}


                  {imagePreviewUrl && selectedFile && selectedFile.type.startsWith('image/') && (
                    <div className="my-4 p-2 border rounded-md">
                      <FormLabel className="text-sm">Preview:</FormLabel>
                      <NextImage src={imagePreviewUrl} alt="Selected image preview" width={200} height={200} className="mt-2 rounded-md object-contain max-h-48 w-auto" />
                    </div>
                  )}
                  {selectedFile && !selectedFile.type.startsWith('image/') && (
                     <div className="my-4 p-3 border rounded-md bg-muted/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileWarning className="h-5 w-5 text-amber-500" />
                            <span>No preview available for this file type ({selectedFile.type}).</span>
                        </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 items-center">
                    <Button type="submit" disabled={!selectedFile && !documentForm.getValues("name")}><PlusCircle className="mr-2 h-4 w-4"/> Add Document Record</Button>
                    {selectedFile && (
                      <Button type="button" variant="outline" onClick={handleDownloadSelectedFile}>
                        <Download className="mr-2 h-4 w-4" /> Download Selected File
                      </Button>
                    )}
                  </div>
                   <FormDescription className="text-xs">
                        Adding a record stores metadata (name, description, file details) in MongoDB.
                        The "Download Selected File" button works only for the file currently chosen/captured above and downloads it from your browser.
                    </FormDescription>
                </form>
              </Form>
            </CardContent>
          </Card>

          {selectedEmployee && selectedEmployee.documents.length > 0 && (
            <Card className="mt-6">
              <CardHeader><CardTitle className="text-lg font-semibold">Uploaded Document Records</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Uploaded At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEmployee.documents.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell className="truncate max-w-xs">
                          {doc.fileName ? (
                             <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                <FileUp className="h-3 w-3"/> {doc.fileName}
                             </Badge>
                          ) : <span className="text-muted-foreground text-xs">No file attached</span>}
                        </TableCell>
                        <TableCell>{format(new Date(doc.uploadedAt), "PPP p")}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenPreviewDialog(doc)} aria-label="Preview document metadata">
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Preview</span>
                          </Button>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setDocumentToDelete({ empId: selectedEmployee.id, docId: doc.id, docName: doc.name })} aria-label="Delete document record">
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
           <DialogFooter className="mt-4">
             <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewDocumentDialogOpen} onOpenChange={setIsPreviewDocumentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline">Document Record: {documentToPreview?.name}</DialogTitle>
          </DialogHeader>
          {documentToPreview && (
            <div className="space-y-3 py-4">
              <p><span className="font-semibold">Document Title:</span> {documentToPreview.name}</p>
              <p><span className="font-semibold">Description:</span> {documentToPreview.description || "N/A"}</p>
              <p><span className="font-semibold">Record Added:</span> {format(new Date(documentToPreview.uploadedAt), "PPP p")}</p>
              {documentToPreview.fileName ? (
                <>
                  <p><span className="font-semibold">Attached File Name:</span> {documentToPreview.fileName}</p>
                  <p><span className="font-semibold">File Type:</span> {documentToPreview.fileType || "N/A"}</p>
                  <p><span className="font-semibold">File Size:</span> {formatFileSize(documentToPreview.fileSize)}</p>
                </>
              ) : (
                 <p className="text-muted-foreground italic">No file was attached to this document record.</p>
              )}
              <Alert variant="default" className="mt-6 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                <InfoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-700 dark:text-blue-300">Important Note on File Handling</AlertTitle>
                <AlertDescription className="text-xs text-blue-600 dark:text-blue-400">
                  This application demo stores document metadata (like name and file details) in MongoDB.
                  Actual file content (the file itself) is not uploaded to or stored on any server or cloud storage.
                  Therefore, direct preview or download of previously "uploaded" files from this dialog is not possible.
                  The "Download Selected File" button in the "Add Document Record" form only works for the file currently selected/captured in your browser before its metadata is saved.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter className="sm:justify-between items-center pt-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}> 
                    <Button variant="outline" disabled>
                      <Download className="mr-2 h-4 w-4" />
                      Download Stored File
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Actual file download from storage is not implemented in this demo as original files are not stored.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={() => setIsPreviewDocumentDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!documentToDelete} onOpenChange={(isOpen) => !isOpen && setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the document record for "{documentToDelete?.docName}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete Record</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
