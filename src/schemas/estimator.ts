import { z } from 'zod';

export const estimatorSchema = z.object({
    service: z.string().min(1, "Service type is required"),
    area_m2: z.number().nonnegative("Area must be a positive number"),
    length_m: z.number().nonnegative().optional(),
    width_m: z.number().nonnegative().optional(),
    materialTier: z.enum(['standard', 'premium', 'luxury']).optional(),
    hasExcavatorAccess: z.boolean().optional(),
    hasDrivewayForSkip: z.boolean().optional(),
    slopeLevel: z.enum(['flat', 'moderate', 'steep']).optional(),
    subBaseType: z.string().optional(),
    existingDemolition: z.boolean().optional(),
    deckHeight_m: z.number().nonnegative().optional(),

    // Contact details
    fullName: z.string().min(2, "Name is too short").max(100).optional(),
    contactPhone: z.string().min(5, "Phone number is too short").max(20).optional(),
    contactEmail: z.string().email("Invalid email address").optional(),
    userBudget: z.number().nonnegative("Budget must be positive").optional()
});

export type EstimatorInputs = z.infer<typeof estimatorSchema>;

export const contactSchema = z.object({
    fullName: z.string().min(2, "Name is required"),
    contactPhone: z.string().min(5, "Phone number is required"),
    contactEmail: z.string().email("Valid email is required"),
    userBudget: z.number().nonnegative().optional()
});
