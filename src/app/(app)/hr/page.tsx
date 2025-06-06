
"use client";

import React, { useState } from 'react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, PlusCircle, FileText, Trash2, Eye, FileUp, InfoIcon, Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const employeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(100),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
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


  const employeeForm = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: '', email: '' },
  });

  const documentForm = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: { name: '', description: '' },
  });

  const onEmployeeSubmit: SubmitHandler<EmployeeFormData> = async (data) => {
    const newEmployee = await addEmployee(data);
    if (newEmployee) {
      toast({ title: "Employee Added", description: `${data.name} has been added.` });
      employeeForm.reset();
      setIsEmployeeFormOpen(false);
    } else {
      toast({ title: "Error", description: `Failed to add employee ${data.name}.`, variant: "destructive" });
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
      await addEmployeeDocument(selectedEmployee.id, documentData as Omit<EmployeeDocument, 'id' | 'uploadedAt'>);
      toast({ title: "Document Record Added", description: `Document '${data.name}' added for ${selectedEmployee.name}.` });
      documentForm.reset();
      setSelectedFile(null);
      
      const updatedEmployee = await getEmployeeById(selectedEmployee.id);
      setSelectedEmployee(updatedEmployee || null);
    }
  };

  const openDocumentDialog = async (employeeId: string) => {
    const employee = await getEmployeeById(employeeId);
    if (employee) {
        setSelectedEmployee(employee);
        documentForm.reset(); 
        setSelectedFile(null);
        setIsDocumentDialogMainOpen(true);
    } else {
        toast({title: "Error", description: "Could not load employee data.", variant: "destructive"});
    }
  };

  const handleOpenPreviewDialog = (doc: EmployeeDocument) => {
    setDocumentToPreview(doc);
    setIsPreviewDocumentDialogOpen(true);
  };

  const handleDeleteDocument = async () => {
    if (documentToDelete && selectedEmployee) {
      await deleteEmployeeDocument(documentToDelete.empId, documentToDelete.docId);
      toast({ title: "Document Deleted", description: `Document '${documentToDelete.docName}' has been deleted.` });
      const updatedEmployee = await getEmployeeById(selectedEmployee.id);
      setSelectedEmployee(updatedEmployee || null);
      setDocumentToDelete(null); 
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      documentForm.setValue("name", file.name.split('.').slice(0, -1).join('.') || file.name); // Pre-fill name from filename
    } else {
      setSelectedFile(null);
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
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center">
          <Users className="mr-3 h-8 w-8 text-primary" /> HR & Employee Management
        </h1>
        <Dialog open={isEmployeeFormOpen} onOpenChange={setIsEmployeeFormOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-5 w-5" /> Add Employee</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-headline">New Employee</DialogTitle></DialogHeader>
            <Form {...employeeForm}>
              <form onSubmit={employeeForm.handleSubmit(onEmployeeSubmit)} className="space-y-4">
                <FormField control={employeeForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={employeeForm.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl><Input type="email" placeholder="e.g., jane.doe@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
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
          {loadingEmployees && <p>Loading employees...</p>}
          {!loadingEmployees && employees.length === 0 && (
            <p className="text-muted-foreground text-center py-4">No employees added yet.</p>
          )}
          {!loadingEmployees && employees.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Documents</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.email || 'N/A'}</TableCell>
                    <TableCell className="text-center">{employee.documents.length}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openDocumentDialog(employee.id)}>
                        <FileText className="mr-2 h-4 w-4" /> Manage Documents
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
        }
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline">Manage Documents for {selectedEmployee?.name}</DialogTitle>
            <CardDescription>Add new document records or view existing ones. Firestore is used for employee data.</CardDescription>
          </DialogHeader>
          
          <Card>
            <CardHeader><CardTitle className="text-lg font-semibold">Add New Document Record</CardTitle></CardHeader>
            <CardContent>
              <Form {...documentForm}>
                <form onSubmit={documentForm.handleSubmit(onDocumentSubmit)} className="space-y-4">
                  <FormField control={documentForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Name / Title</FormLabel>
                      <FormControl><Input placeholder="e.g., Passport, Contract, Resume" {...field} /></FormControl>
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
                  <FormItem>
                    <FormLabel>Attach File (Metadata Only)</FormLabel>
                    <FormControl>
                      <Input 
                        type="file" 
                        onChange={handleFileChange} 
                        className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                      />
                    </FormControl>
                    {selectedFile && (
                        <FormDescription className="flex items-center gap-1 pt-1">
                            <FileUp className="h-4 w-4 text-muted-foreground" /> Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                        </FormDescription>
                    )}
                    <FormDescription>This demo stores file metadata only. Actual file upload to cloud storage is not implemented.</FormDescription>
                  </FormItem>
                  <Button type="submit"><PlusCircle className="mr-2 h-4 w-4"/> Add Document Record</Button>
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
                        <TableCell>{format(doc.uploadedAt, "PPP p")}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenPreviewDialog(doc)} aria-label="Preview document metadata">
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Preview</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDocumentToDelete({ empId: selectedEmployee.id, docId: doc.id, docName: doc.name })} aria-label="Delete document record">
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Delete</span>
                          </Button>
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
              <p><span className="font-semibold">Record Added:</span> {format(documentToPreview.uploadedAt, "PPP p")}</p>
              {documentToPreview.fileName ? (
                <>
                  <p><span className="font-semibold">Attached File Name:</span> {documentToPreview.fileName}</p>
                  <p><span className="font-semibold">File Type:</span> {documentToPreview.fileType || "N/A"}</p>
                  <p><span className="font-semibold">File Size:</span> {formatFileSize(documentToPreview.fileSize)}</p>
                </>
              ) : (
                 <p className="text-muted-foreground italic">No file was attached to this document record.</p>
              )}
              <Alert className="mt-6">
                <InfoIcon className="h-5 w-5" />
                <AlertTitle>Important Note</AlertTitle>
                <AlertDescription className="text-xs">
                  Actual file content preview and download are not implemented in this demo application, as it does not include backend file storage. This preview only shows the metadata associated with the document record.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter className="sm:justify-between items-center pt-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* The span is necessary for TooltipTrigger asChild with a disabled button */}
                  <span tabIndex={0}> 
                    <Button variant="outline" disabled>
                      <Download className="mr-2 h-4 w-4" />
                      Download File
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Actual file download is not implemented in this demo.</p>
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
            <AlertDialogAction onClick={handleDeleteDocument} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
