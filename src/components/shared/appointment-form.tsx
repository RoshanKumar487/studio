
"use client";

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DatePicker } from '@/components/shared/date-picker';
import type { Appointment } from '@/lib/types';

const appointmentSchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)."),
  title: z.string().min(1, "Title is required.").max(100, "Title too long."),
  description: z.string().max(200, "Description too long.").optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  onSubmit: (data: Omit<Appointment, 'id' | 'date'> & { date: Date }) => void;
  initialData?: Partial<AppointmentFormData>;
  onCancel?: () => void;
}

export function AppointmentForm({ onSubmit, initialData, onCancel }: AppointmentFormProps) {
  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      date: initialData?.date ?? new Date(),
      time: initialData?.time ?? '',
      title: initialData?.title ?? '',
      description: initialData?.description ?? '',
    },
  });

  const handleFormSubmit: SubmitHandler<AppointmentFormData> = (data) => {
    onSubmit(data);
    form.reset({
      date: new Date(),
      time: '',
      title: '',
      description: '',
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <DatePicker date={field.value} setDate={field.onChange} />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time (HH:MM)</FormLabel>
              <FormControl>
                <Input type="time" placeholder="e.g., 14:30" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title / Client</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Meeting with John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Discuss project milestones" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2 justify-end">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
          <Button type="submit">Save Appointment</Button>
        </div>
      </form>
    </Form>
  );
}
