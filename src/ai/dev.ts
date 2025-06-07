
import { config } from 'dotenv';
config();

// Removed: import '@/ai/flows/suggest-appointment-times.ts';
import '@/ai/flows/add-employee-by-text-flow.ts';
import '@/ai/flows/process-invoice-query-flow.ts';
import '@/ai/flows/classify-task-flow.ts';
import '@/ai/flows/send-invoice-email-flow.ts';

    
