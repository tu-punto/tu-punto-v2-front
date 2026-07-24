import { Tag, Typography } from "antd";
import { formatMoney, resolvePromotionPricing, type PromotionPricingLike } from "../utils/promotionPricing";

type Props = {
  basePrice?: number | null;
  price?: number | null;
  promotion?: PromotionPricingLike;
  quantity?: number;
  compact?: boolean;
};

const PromotionPrice = ({ basePrice, price, promotion, quantity = 1, compact = false }: Props) => {
  const pricing = resolvePromotionPricing(basePrice ?? price ?? 0, promotion, quantity);
  const showBase = pricing.hasPromotion && pricing.basePrice > pricing.effectivePrice;
  const tierLabel = pricing.matchedTier
    ? `Desde ${pricing.matchedTier.minQuantity}`
    : pricing.tiers.length > 0
      ? `Por cantidad`
      : pricing.title
        ? "Promoción"
        : null;

  return (
    <div>
      <Typography.Text strong style={{ color: showBase ? "#0f766e" : undefined }}>
        {formatMoney(pricing.effectivePrice)}
      </Typography.Text>
      {showBase && (
        <div style={{ lineHeight: 1.15 }}>
          <Typography.Text delete type="secondary" style={{ fontSize: compact ? 11 : 12 }}>
            {formatMoney(pricing.basePrice)}
          </Typography.Text>
        </div>
      )}
      {tierLabel && (
        <Tag color={pricing.matchedTier ? "cyan" : "green"} bordered={false} style={{ marginTop: 4 }}>
          {tierLabel}
        </Tag>
      )}
      {!compact && pricing.tiers.length > 0 && (
        <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
          {pricing.tiers.map((tier) => (
            <Tag key={`${tier.minQuantity}-${tier.unitPrice}`} bordered={false} color="cyan">
              {tier.minQuantity}+ {formatMoney(tier.unitPrice)}
            </Tag>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromotionPrice;
