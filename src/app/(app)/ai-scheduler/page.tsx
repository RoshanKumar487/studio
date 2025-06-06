"use client";

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Sparkles, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { suggestAppointmentTimes, type SuggestAppointmentTimesInput, type SuggestAppointmentTimesOutput } from '@/ai/flows/suggest-appointment-times';

const aiSchedulerSchema = z.object({
  historicalData: z.string().min(10, "Please provide some historical data."),
  revenueProjections: z.string().min(10, "Please provide some revenue projections."),
  appointmentDuration: z.coerce.number().int().min(15, "Duration must be at least 15 minutes."),
  availableDays: z.string().min(3, "Please specify available days."),
  availableTimeSlots: z.string().min(3, "Please specify available time slots."),
});

type AiSchedulerFormData = z.infer<typeof aiSchedulerSchema>;

export default function AiSchedulerPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestAppointmentTimesOutput | null>(null);

  const form = useForm<AiSchedulerFormData>({
    resolver: zodResolver(aiSchedulerSchema),
    defaultValues: {
      historicalData: "E.g., Last month: 20 appointments, $2000 revenue. Peak times: Wed 2-4 PM, Fri 10-12 AM.",
      revenueProjections: "E.g., Expect 10% growth next month. High demand for service X.",
      appointmentDuration: 60,
      availableDays: "Monday, Wednesday, Friday",
      availableTimeSlots: "9:00-12:00, 14:00-17:00",
    },
  });

  const onSubmit: SubmitHandler<AiSchedulerFormData> = async (data) => {
    setIsLoading(true);
    setSuggestions(null);
    try {
      const result = await suggestAppointmentTimes(data);
      setSuggestions(result);
      toast({
        title: "Suggestions Ready",
        description: "AI has generated optimal appointment times.",
      });
    } catch (error) {
      console.error("AI Scheduler Error:", error);
      toast({
        title: "Error",
        description: "Failed to get suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Sparkles className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline tracking-tight">AI Scheduling Assistant</h1>
      </div>
      <p className="text-muted-foreground">
        Let AI help you find the best times for appointments based on your data and preferences to maximize your earnings.
      </p>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Provide Scheduling Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="historicalData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Historical Appointment Data</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Describe past appointment trends, peak times, revenue, etc." {...field} />
                    </FormControl>
                    <FormDescription>Include dates, times, duration, and revenue if possible.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="revenueProjections"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revenue Projections</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Describe expected revenue, busy periods, promotions, etc." {...field} />
                    </FormControl>
                     <FormDescription>Help the AI understand future demand.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="appointmentDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointment Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 60" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="availableDays"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Available Days</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Monday, Tuesday, Friday" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="availableTimeSlots"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Time Slots</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 09:00-12:00, 14:00-18:00" {...field} />
                    </FormControl>
                    <FormDescription>Use 24-hour format for time ranges.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Get AI Suggestions
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {suggestions && (
        <Card className="shadow-lg animate-in fade-in-50 duration-500">
          <CardHeader>
            <CardTitle className="font-headline text-primary">AI Generated Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Suggested Times:</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{suggestions.suggestedTimes}</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Reasoning:</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{suggestions.reasoning}</p>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">These are AI-generated suggestions. Use your best judgment when scheduling.</p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
