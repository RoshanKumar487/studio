
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppData } from '@/context/app-data-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AppLogo } from '@/components/shared/app-logo';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const mobileSchema = z.object({
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits.").max(15, "Mobile number too long.").regex(/^\+?[0-9\s-]+$/, "Invalid mobile number format."),
});
type MobileFormData = z.infer<typeof mobileSchema>;

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits."),
});
type OtpFormData = z.infer<typeof otpSchema>;


export default function LoginPage() {
  const router = useRouter();
  const { sendOtp, loginWithOtp, isAuthenticated, authLoading } = useAppData();
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [currentMobileNumber, setCurrentMobileNumber] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const mobileForm = useForm<MobileFormData>({
    resolver: zodResolver(mobileSchema),
    defaultValues: { mobileNumber: '' },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);


  const handleSendOtp: SubmitHandler<MobileFormData> = async (data) => {
    setIsSendingOtp(true);
    const success = await sendOtp(data.mobileNumber);
    if (success) {
      setCurrentMobileNumber(data.mobileNumber);
      setShowOtpForm(true);
      otpForm.reset({ otp: '' }); // Explicitly reset otp field to empty string
    }
    setIsSendingOtp(false);
  };

  const handleVerifyOtp: SubmitHandler<OtpFormData> = async (data) => {
    setIsVerifyingOtp(true);
    const loginSuccess = await loginWithOtp(currentMobileNumber, data.otp);
    if (loginSuccess) {
      router.replace('/dashboard'); // Redirect after successful login
    }
    setIsVerifyingOtp(false);
  };

  if (authLoading || (!authLoading && isAuthenticated)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="items-center text-center">
          <AppLogo />
          <CardTitle className="font-headline text-2xl tracking-tight">Welcome Back!</CardTitle>
          <CardDescription>
            {showOtpForm ? `Enter the OTP sent to ${currentMobileNumber}.` : "Sign in with your mobile number."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="default" className="bg-yellow-50 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700">
            <ShieldAlert className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <AlertTitle className="text-yellow-700 dark:text-yellow-500">Demonstration Only</AlertTitle>
            <AlertDescription className="text-xs text-yellow-600 dark:text-yellow-400">
              This is a mocked OTP login for UI demonstration. No actual SMS is sent.
              A pre-defined OTP will be shown for testing after you submit your mobile number.
            </AlertDescription>
          </Alert>

          {!showOtpForm ? (
            <Form {...mobileForm}>
              <form onSubmit={mobileForm.handleSubmit(handleSendOtp)} className="space-y-4">
                <FormField
                  control={mobileForm.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="e.g., +1 555 123 4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSendingOtp}>
                  {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send OTP
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-4">
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enter OTP</FormLabel>
                      <FormControl>
                        <Input type="text" maxLength={6} placeholder="Enter 6-digit OTP" {...field} 
                         inputMode="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isVerifyingOtp}>
                  {isVerifyingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Login
                </Button>
                <Button variant="link" onClick={() => {setShowOtpForm(false); mobileForm.reset();}} className="w-full">
                  Change mobile number?
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} BizView. All rights reserved.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
