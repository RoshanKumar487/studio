
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppData } from "@/context/app-data-context";
import { DollarSign, TrendingUp, TrendingDown, CalendarClock, Users, Building, Loader2, PieChartIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';

const PIE_CHART_COLORS = [
  'hsl(var(--chart-1))', 
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-3))', 
  'hsl(var(--chart-4))', 
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--accent))',
];


export default function DashboardPage() {
  const { totalRevenue, totalExpenses, netProfit, revenueEntries, expenseEntries, appointments, employees, invoices, loadingEmployees } = useAppData();

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

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter(app => app.date >= new Date())
      .sort((a,b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [appointments]);

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
      .sort((a, b) => b.value - a.value); // Sort for consistent pie chart display
  }, [expenseEntries]);

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
      </div>

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

      <Card className="shadow-lg md:col-span-3"> {/* Changed to md:col-span-3 for full width */}
           <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <CalendarClock className="mr-2 h-5 w-5 text-primary" /> Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length > 0 ? (
              <ul className="space-y-3">
                {upcomingAppointments.map(app => (
                  <li key={app.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                    <div>
                      <p className="font-semibold">{app.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(app.date, "EEEE, MMM d, yyyy")} at {app.time}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No upcoming appointments.</p>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
