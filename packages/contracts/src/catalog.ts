import { z } from 'zod';
import { catalogPlanSchema } from './catalog-plan';
export * from './catalog-plan';

export const catalogAvailability = ['CONTACT_US', 'AVAILABLE', 'LIMITED', 'SOLD_OUT', 'COMING_SOON'] as const;
export const catalogAvailabilityLabels: Record<typeof catalogAvailability[number], string> = {
  CONTACT_US: 'Contact us for availability', AVAILABLE: 'Available', LIMITED: 'Limited availability',
  SOLD_OUT: 'Sold out', COMING_SOON: 'Coming soon',
};
export const catalogConditions = ['PRE_OWNED', 'BRAND_NEW'] as const;
export const catalogConditionLabels = { PRE_OWNED: 'Pre-Owned', BRAND_NEW: 'Brand New' } as const;
export const catalogAssets = ['iphone-11', 'iphone-12', 'iphone-13', 'ipad-10th-gen', 'ipad-a16', 'iphone-13-pro'] as const;
export const catalogItemSchema = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and hyphens for the listing code.').transform(value => value.toUpperCase()),
  name: z.string().trim().min(2).max(100),
  condition: z.enum(catalogConditions),
  dailyAmount: z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/, 'Enter a price with at most two decimal places.').refine(value => Number(value) > 0, 'Price must be positive.').nullable(),
  availability: z.enum(catalogAvailability),
  description: z.string().trim().max(240),
  published: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
  imageAsset: z.enum(catalogAssets).nullable(),
  installmentPlan: catalogPlanSchema.nullable(),
}).strict();
export const catalogUpdateSchema = z.object({ version: z.number().int().positive(), record: catalogItemSchema }).strict();
export const catalogImageSchema = z.object({ version: z.coerce.number().int().positive() }).strict();
export const catalogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  q: z.string().trim().max(100).default(''),
  visibility: z.enum(['PUBLISHED', 'HIDDEN']).optional(),
  availability: z.enum(catalogAvailability).optional(),
}).strict();
export const publicCatalogQuerySchema = catalogQuerySchema.omit({ visibility: true });
export type CatalogInput = z.infer<typeof catalogItemSchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type CatalogItem = CatalogInput & { id: string; version: number; hasImage: boolean; updatedAt: string };
export type PublicCatalogItem = Pick<CatalogItem, 'id' | 'name' | 'condition' | 'dailyAmount' | 'availability' | 'description' | 'imageAsset' | 'hasImage' | 'version' | 'installmentPlan'>;
