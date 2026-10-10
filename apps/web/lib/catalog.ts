import type { CatalogInput, CatalogItem, PublicCatalogItem } from "@freshphones/contracts";
import { API_URL } from "./backend";

export const emptyCatalogInput: CatalogInput = { code: "", name: "", condition: "PRE_OWNED", dailyAmount: null,
  availability: "CONTACT_US", description: "", published: false, sortOrder: 0, imageAsset: null, installmentPlan: null };
export function catalogDraft(item: CatalogItem): CatalogInput {
  const { code, name, condition, dailyAmount, availability, description, published, sortOrder, imageAsset, installmentPlan } = item;
  return { code, name, condition, dailyAmount, availability, description, published, sortOrder, imageAsset,
    installmentPlan: installmentPlan ? { ...installmentPlan } : null };
}
export function catalogPhoto(item: PublicCatalogItem, staff = false) {
  if (item.hasImage) return `${API_URL}/api/catalog/${staff ? "items/" : ""}${item.id}/image?v=${item.version}`;
  return item.imageAsset ? `/products/${item.imageAsset}-overlap-transparent.png` : null;
}
export function catalogPrice(amount: string | null) {
  return amount === null ? "Ask for pricing" : `₱${Number(amount).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}
