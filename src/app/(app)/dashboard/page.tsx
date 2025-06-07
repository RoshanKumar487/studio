
"use client";

import React, { useMemo, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAppData } from "@/context/app-data-context";
import { DollarSign, TrendingUp, TrendingDown, Users, Building, Loader2, PieChartIcon, Banknote, Landmark, LinkIcon, Unlink } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const PIE_CHART_COLORS = [
  'hsl(var(--chart-1))', 
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-3))', 
  'hsl(var(--chart-4))', 
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--accent))',
];

const bankConnectionSchema = z.object({
  bankName: z.string().min(2, "Bank name must be at least 2 characters."),
  accountType: z.enum(["Checking", "Savings", "Credit Card"], { required_error: "Please select an account type."}),
  mockUsername: z.string().min(1, "Username is required for simulation."),
  mockPassword: z.string().min(1, "Password is required for simulation."),
});
type BankConnectionFormData = z.infer<typeof bankConnectionSchema>;

interface BankConnectionDetails {
  connected: boolean;
  bankName: string | null;
  accountType: string | null;
}

export default function DashboardPage() {
  const { totalRevenue, totalExpenses, netProfit, revenueEntries, expenseEntries, employees, invoices, loadingEmployees } = useAppData();
  const { toast } = useToast();
  
  const [isBankConnectFormOpen, setIsBankConnectFormOpen] = useState(false);
  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false);
  const [bankConnectionDetails, setBankConnectionDetails] = useState<BankConnectionDetails>({
    connected: false,
    bankName: null,
    accountType: null,
  });

  const bankForm = useForm<BankConnectionFormData>({
    resolver: zodResolver(bankConnectionSchema),
    defaultValues: {
      bankName: '',
      accountType: undefined,
      mockUsername: '',
      mockPassword: '',
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const last30Days = useMemo(() => eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() }), []);
  
  const dailyChartData = useMemo(() => {
    return last30Days.map(day => {
      const formattedDate = format(day, 'MMM d');
      const dailyRevenue = revenueEntries
        .filter(entry => format(entry.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
        .reduce((sum, entry) => sum + entry.amount, 0);
      const dailyExpenses = expenseEntries
        .filter(entry => format(entry.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
        .reduce((sum, entry) => sum + entry.amount, 0);
      return {
        date: formattedDate,
        revenue: dailyRevenue,
        expenses: dailyExpenses,
        profit: dailyRevenue - dailyExpenses,
      };
    });
  }, [last30Days, revenueEntries, expenseEntries]);

  const employeeCount = useMemo(() => employees.length, [employees]);
  const uniqueCustomerNames = useMemo(() => new Set(invoices.map(inv => inv.customerName)), [invoices]);
  const uniqueCustomerCount = useMemo(() => uniqueCustomerNames.size, [uniqueCustomerNames]);

  const expensesByCategory = useMemo(() => {
    const categoryMap: { [key: string]: number } = {};
    expenseEntries.forEach(entry => {
      categoryMap[entry.category] = (categoryMap[entry.category] || 0) + entry.amount;
    });
    return Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); 
  }, [expenseEntries]);

  const onBankConnectSubmit: SubmitHandler<BankConnectionFormData> = (data) => {
    setBankConnectionDetails({
      connected: true,
      bankName: data.bankName,
      accountType: data.accountType,
    });
    toast({
      title: "Bank Connection Simulated",
      description: `Successfully 'connected' to ${data.bankName} (${data.accountType}).`,
    });
    bankForm.reset();
    setIsBankConnectFormOpen(false);
  };

  const handleDisconnectBank = () => {
    setBankConnectionDetails({
      connected: false,
      bankName: null,
      accountType: null,
    });
    toast({
      title: "Bank Disconnected (Simulated)",
      description: "You have 'disconnected' your bank account.",
      variant: "default",
    });
    setIsDisconnectConfirmOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">All time revenue</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">All time expenses</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">All time profit</p>
          </CardContent>
        </Card>
         <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingEmployees ? (
              <div className="flex items-center text-2xl font-bold">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading...
              </div>
            ) : (
              <div className="text-2xl font-bold">{employeeCount}</div>
            )}
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
            <Building className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCustomerCount}</div>
            <p className="text-xs text-muted-foreground">Based on invoices</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {bankConnectionDetails.connected ? "Bank Account Linked" : "Link Bank Account"}
            </CardTitle>
            <Banknote className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {bankConnectionDetails.connected ? (
              <>
                <p className="text-sm">Connected to: <strong>{bankConnectionDetails.bankName}</strong> ({bankConnectionDetails.accountType})</p>
                <p className="text-xs text-muted-foreground mt-1">Transactions are being (notionally) synced.</p>
                <Button variant="outline" className="w-full mt-3" onClick={() => setIsDisconnectConfirmOpen(true)}>
                  <Unlink className="mr-2 h-4 w-4" /> Disconnect Bank
                </Button>
              </>
            ) : (
              <>
                <Button className="w-full mt-2" onClick={() => setIsBankConnectFormOpen(true)}>
                  <LinkIcon className="mr-2 h-4 w-4" /> Connect Bank
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Automate transaction imports (simulated).</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isBankConnectFormOpen} onOpenChange={setIsBankConnectFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary"/> Connect Your Bank Account (Simulated)
            </DialogTitle>
            <DialogDescription>
              Enter mock details to simulate connecting a bank account. 
              <strong>Do NOT use real bank credentials.</strong>
            </DialogDescription>
          </DialogHeader>
          <Form {...bankForm}>
            <form onSubmit={bankForm.handleSubmit(onBankConnectSubmit)} className="space-y-4 py-2">
              <FormField
                control={bankForm.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Mock National Bank" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={bankForm.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select account type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Checking">Checking</SelectItem>
                        <SelectItem value="Savings">Savings</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={bankForm.control}
                name="mockUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username (Demo Only)</FormLabel>
                    <FormControl><Input placeholder="demo_user" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={bankForm.control}
                name="mockPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (Demo Only)</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Alert variant="default" className="mt-4 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700">
                  <AlertTitle className="text-amber-700 dark:text-amber-300 text-xs">Important Simulation Note:</AlertTitle>
                  <AlertDescription className="text-xs text-amber-600 dark:text-amber-400">
                    This is a simulation. No actual bank connection will be made, and no data is sent or stored.
                  </AlertDescription>
              </Alert>
              <DialogFooter className="pt-2">
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">
                  <LinkIcon className="mr-2 h-4 w-4"/> Connect Account (Simulate)
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDisconnectConfirmOpen} onOpenChange={setIsDisconnectConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect from {bankConnectionDetails.bankName || 'Bank'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect? This will stop the (notional) automatic import of transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnectBank} className="bg-destructive hover:bg-destructive/90">
              Disconnect (Simulate)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-lg md:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Daily Performance (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`}/>
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)"}}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }}/>
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="expenses" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg md:col-span-1">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
                <PieChartIcon className="mr-2 h-5 w-5 text-primary" /> Expense Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px">
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name]}/>
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center pt-10">No expense data for chart.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
