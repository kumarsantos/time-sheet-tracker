import z from 'zod';

const hoursMessage = 'Hours must be a number between 0.5 and 24';

const isValidHours = (value: string | number) => {
  const hours = Number(value);
  return Number.isFinite(hours) && hours > 0 && hours <= 24;
};

// Client-side form schema — `hours` arrives as a string from the number input
export const addWorkFormSchema = z.object({
  projectId: z.string().min(1, { message: 'Project is required' }),
  typeOfWork: z
    .string()
    .min(1, { message: 'Type of work is required' })
    .max(100, { message: 'Type of work must be 100 characters or less' }),
  description: z.string().min(1, { message: 'Description is required' }),
  hours: z.string().min(1, { message: 'Hours are required' }).refine(isValidHours, {
    message: hoursMessage,
  }),
});

export type AddWorkFormData = z.infer<typeof addWorkFormSchema>;

// Server/API schema — `hours` arrives as a number in the JSON payload
export const addWorkApiSchema = addWorkFormSchema.extend({
  hours: z.coerce.number().refine(isValidHours, { message: hoursMessage }),
});

export type AddWorkApiData = z.infer<typeof addWorkApiSchema>;
