export type PromotionTier = {
  minQuantity: number;
  unitPrice: number;
};

export type PromotionPricingLike = {
  label?: string | null;
  title?: string | null;
  simplePrice?: number | null;
  tiers?: PromotionTier[] | null;
  effectivePrice?: number | null;
  discountPercent?: number | null;
  matchedTier?: PromotionTier | null;
  scope?: string | null;
} | null | undefined;

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatMoney = (value?: number | null) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2
  }).format(toNumber(value || 0));

export const normalizePromotionTiers = (tiers: PromotionTier[] = []) =>
  tiers
    .map((tier) => ({
      minQuantity: Math.max(2, Math.floor(toNumber(tier?.minQuantity))),
      unitPrice: Number(toNumber(tier?.unitPrice).toFixed(2))
    }))
    .filter((tier) => tier.minQuantity >= 2 && tier.unitPrice > 0)
    .sort((left, right) => left.minQuantity - right.minQuantity);

export const resolvePromotionPricing = (
  basePrice?: number | null,
  promotion?: PromotionPricingLike,
  quantity = 1
) => {
  const normalizedBase = Number(toNumber(basePrice || 0).toFixed(2));
  const normalizedTiers = normalizePromotionTiers((promotion?.tiers || []) as PromotionTier[]);
  const simplePrice =
    promotion?.simplePrice === undefined || promotion?.simplePrice === null
      ? null
      : Number(toNumber(promotion.simplePrice).toFixed(2));
  const safeQuantity = Math.max(1, Math.floor(toNumber(quantity || 1)));
  const matchedTier = [...normalizedTiers]
    .sort((left, right) => right.minQuantity - left.minQuantity)
    .find((tier) => safeQuantity >= tier.minQuantity);
  const effectivePrice = Number(
    (promotion?.effectivePrice ?? matchedTier?.unitPrice ?? simplePrice ?? normalizedBase).toFixed(2)
  );
  const discountPercent =
    normalizedBase > 0 ? Number((((normalizedBase - effectivePrice) / normalizedBase) * 100).toFixed(2)) : 0;

  return {
    basePrice: normalizedBase,
    effectivePrice,
    discountPercent: Math.max(0, discountPercent),
    simplePrice,
    tiers: normalizedTiers,
    matchedTier,
    title: String(promotion?.label || promotion?.title || "").trim() || null,
    hasPromotion: Boolean(promotion) && (normalizedTiers.length > 0 || simplePrice !== null || effectivePrice < normalizedBase)
  };
};
