
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, PlusCircle, FileText, UploadCloud, Trash2, Eye } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

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
  const { employees, addEmployee, addEmployeeDocument, getEmployeeById, deleteEmployeeDocument } = useAppData();
  const { toast } = useToast();
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [isDocumentDialogMainOpen, setIsDocumentDialogMainOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  const [isPreviewDocumentDialogOpen, setIsPreviewDocumentDialogOpen] = useState(false);
  const [documentToPreview, setDocumentToPreview] = useState<EmployeeDocument | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<{ empId: string, docId: string, docName: string } | null>(null);


  const employeeForm = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: '', email: '' },
  });

  const documentForm = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: { name: '', description: '' },
  });

  const onEmployeeSubmit: SubmitHandler<EmployeeFormData> = (data) => {
    addEmployee(data);
    toast({ title: "Employee Added", description: `${data.name} has been added.` });
    employeeForm.reset();
    setIsEmployeeFormOpen(false);
  };

  const onDocumentSubmit: SubmitHandler<DocumentFormData> = (data) => {
    if (selectedEmployee) {
      addEmployeeDocument(selectedEmployee.id, data);
      toast({ title: "Document Record Added", description: `Document '${data.name}' added for ${selectedEmployee.name}.` });
      documentForm.reset();
      // Note: We don't close the main document dialog here, user might want to add more.
      // Refresh selected employee to show new document
      setSelectedEmployee(prev => prev ? getEmployeeById(prev.id) : null); 
    }
  };

  const openDocumentDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDocumentDialogMainOpen(true);
  };

  const handleOpenPreviewDialog = (doc: EmployeeDocument) => {
    setDocumentToPreview(doc);
    setIsPreviewDocumentDialogOpen(true);
  };

  const handleDeleteDocument = () => {
    if (documentToDelete && selectedEmployee) {
      deleteEmployeeDocument(documentToDelete.empId, documentToDelete.docId);
      toast({ title: "Document Deleted", description: `Document '${documentToDelete.docName}' has been deleted.` });
      setSelectedEmployee(prev => prev ? getEmployeeById(prev.id) : null);
      setDocumentToDelete(null); // Close confirmation dialog
    }
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
          {employees.length > 0 ? (
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
                      <Button variant="outline" size="sm" onClick={() => openDocumentDialog(employee)}>
                        <FileText className="mr-2 h-4 w-4" /> Manage Documents
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No employees added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Dialog for Adding/Managing Documents for Selected Employee */}
      <Dialog open={isDocumentDialogMainOpen} onOpenChange={(isOpen) => {
        setIsDocumentDialogMainOpen(isOpen);
        if (!isOpen) setSelectedEmployee(null); 
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline">Manage Documents for {selectedEmployee?.name}</DialogTitle>
            <CardDescription>Add new document records or view existing ones.</CardDescription>
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
                    <FormLabel>Upload File (Simulated)</FormLabel>
                    <FormControl>
                      <div className="flex items-center justify-center w-full">
                        <label htmlFor="dropzone-file-simulated" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-muted-foreground">(Actual file upload not implemented)</p>
                            </div>
                            <input id="dropzone-file-simulated" type="file" className="hidden" disabled />
                        </label>
                      </div> 
                    </FormControl>
                    <FormDescription>For demo purposes, only document name and description will be saved.</FormDescription>
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
                      <TableHead>Description</TableHead>
                      <TableHead>Uploaded At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEmployee.documents.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell className="truncate max-w-xs">{doc.description || 'N/A'}</TableCell>
                        <TableCell>{format(doc.uploadedAt, "PPP p")}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenPreviewDialog(doc)}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Preview</span>
                          </Button>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setDocumentToDelete({ empId: selectedEmployee.id, docId: doc.id, docName: doc.name })}>
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

      {/* Preview Document Dialog */}
      <Dialog open={isPreviewDocumentDialogOpen} onOpenChange={setIsPreviewDocumentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline">Document: {documentToPreview?.name}</DialogTitle>
          </DialogHeader>
          {documentToPreview && (
            <div className="space-y-3 py-4">
              <p><span className="font-semibold">Name:</span> {documentToPreview.name}</p>
              <p><span className="font-semibold">Description:</span> {documentToPreview.description || "N/A"}</p>
              <p><span className="font-semibold">Uploaded At:</span> {format(documentToPreview.uploadedAt, "PPP p")}</p>
               <p className="text-sm text-muted-foreground pt-4">Actual file content preview is not available in this demo.</p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsPreviewDocumentDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Document Confirmation Dialog */}
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
            <AlertDialogAction onClick={handleDeleteDocument} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
