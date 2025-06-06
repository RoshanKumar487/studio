"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppData } from "@/context/app-data-context";
import { DollarSign, TrendingUp, TrendingDown, CalendarClock, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export default function DashboardPage() {
  const { totalRevenue, totalExpenses, netProfit, revenueEntries, expenseEntries, appointments } = useAppData();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Data for charts - last 30 days
  const last30Days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
  
  const dailyChartData = last30Days.map(day => {
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

  const upcomingAppointments = appointments
    .filter(app => app.date >= new Date())
    .sort((a,b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

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
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg col-span-1 md:col-span-2">
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
                />
                <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }}/>
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="expenses" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg md:col-span-2">
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
                     <Users className="h-5 w-5 text-muted-foreground" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No upcoming appointments.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
