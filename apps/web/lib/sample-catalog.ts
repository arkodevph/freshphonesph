import type { PublicCatalogItem } from "@freshphones/contracts";

export const SAMPLE_CATALOG_MODE =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_SITE_TARGET === "landing";

const sampleModels = [
  {
    name: "iPhone 11 128GB",
    imageAsset: "iphone-11",
    total: "18000.00",
    availability: "AVAILABLE",
    condition: "PRE_OWNED",
  },
  {
    name: "iPhone 12 128GB",
    imageAsset: "iphone-12",
    total: "24000.00",
    availability: "AVAILABLE",
    condition: "PRE_OWNED",
  },
  {
    name: "iPhone 13 128GB",
    imageAsset: "iphone-13",
    total: "30000.00",
    availability: "LIMITED",
    condition: "PRE_OWNED",
  },
  {
    name: "iPhone 13 Pro 256GB",
    imageAsset: "iphone-13-pro",
    total: "36000.00",
    availability: "LIMITED",
    condition: "PRE_OWNED",
  },
  {
    name: "iPad 10th Gen 64GB",
    imageAsset: "ipad-10th-gen",
    total: "27000.00",
    availability: "AVAILABLE",
    condition: "BRAND_NEW",
  },
  {
    name: "iPad A16 128GB",
    imageAsset: "ipad-a16",
    total: "33000.00",
    availability: "COMING_SOON",
    condition: "BRAND_NEW",
  },
] as const;

export const sampleCatalog: PublicCatalogItem[] = sampleModels.map(
  (model, index) => {
    return {
      id: `sample-unit-${index + 1}`,
      name: model.name,
      condition: model.condition,
      dailyAmount: null,
      availability: model.availability,
      description:
        "Sample listing. Confirm actual pricing and availability with the team.",
      imageAsset: model.imageAsset,
      hasImage: false,
      version: 1,
      installmentPlan: {
        totalAmount: model.total,
        installmentCount: 12,
        cadence: "MONTHLY",
      },
    };
  },
);
