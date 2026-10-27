import { z } from "zod";

export const inquiryStatuses = ["NEW", "CONTACTED", "CLOSED"] as const;

export const inquiryStatusSchema = z.enum(inquiryStatuses);

export const inquirySchema = z
  .object({
    submissionId: z.string().uuid(),
    name: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .trim()
      .min(7)
      .max(30)
      .regex(/^\+?[\d ()-]+$/, "Enter a valid phone number."),
    email: z
      .union([z.string().trim().email().max(254), z.literal("")])
      .default(""),
    deviceName: z.string().trim().min(1).max(160),
    message: z.string().trim().max(2000).default(""),
    contactAcknowledged: z.literal(true),
  })
  .strict();

export const inquiryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    q: z.string().trim().max(100).default(""),
    status: inquiryStatusSchema.optional(),
  })
  .strict();

export const inquiryUpdateSchema = z
  .object({
    status: inquiryStatusSchema,
    version: z.number().int().positive(),
  })
  .strict();

export type InquiryInput = z.infer<typeof inquirySchema>;

export type InquiryQuery = z.infer<typeof inquiryQuerySchema>;

export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;

export type DeviceInquiry = {
  id: string;
  name: string;
  phone: string;
  email: string;
  deviceName: string;
  message: string;
  status: InquiryStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
};
