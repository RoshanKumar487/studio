"use client";

import React, { useState, useMemo } from 'react';
import { useAppData } from '@/context/app-data-context';
import type { Appointment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AppointmentForm } from '@/components/shared/appointment-form';
import { PlusCircle, CalendarDays } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format, isEqual, startOfDay } from 'date-fns';

export default function AppointmentsPage() {
  const { appointments, addAppointment } = useAppData();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleAddAppointment = (data: Omit<Appointment, 'id' | 'date'> & { date: Date }) => {
    addAppointment(data);
    toast({
      title: "Appointment Scheduled",
      description: `Appointment for ${data.title} on ${format(data.date, "PPP")} at ${data.time} has been scheduled.`,
    });
    setIsFormOpen(false);
  };

  const appointmentsOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return appointments
      .filter(app => isEqual(startOfDay(app.date), startOfDay(selectedDate)))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate]);

  const appointmentDates = useMemo(() => {
    return appointments.map(app => startOfDay(app.date));
  }, [appointments]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Appointments</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" /> Add Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="font-headline">New Appointment</DialogTitle>
            </DialogHeader>
            <AppointmentForm 
              onSubmit={handleAddAppointment} 
              onCancel={() => setIsFormOpen(false)}
              initialData={{ date: selectedDate || new Date() }}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-lg">
          <CardContent className="p-0 md:p-2 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md"
              modifiers={{ booked: appointmentDates }}
              modifiersClassNames={{ booked: "border-primary border-2 rounded-md" }}
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <CalendarDays className="mr-2 h-5 w-5 text-primary" /> 
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate && appointmentsOnSelectedDate.length > 0 ? (
              <ul className="space-y-3">
                {appointmentsOnSelectedDate.map(app => (
                  <li key={app.id} className="p-3 bg-muted/50 rounded-md">
                    <p className="font-semibold">{app.title}</p>
                    <p className="text-sm text-muted-foreground">{app.time}</p>
                    {app.description && <p className="text-xs text-muted-foreground mt-1">{app.description}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                {selectedDate ? "No appointments for this day." : "Select a day to see appointments."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
