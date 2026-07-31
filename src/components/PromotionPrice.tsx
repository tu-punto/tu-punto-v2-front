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
  const pricing = resolvePromotionPricing(basePrice ?? price ?? 0, promotion ?? price ?? null, quantity);
  const showBase = pricing.hasPromotion && pricing.basePrice > pricing.effectivePrice;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Typography.Text strong style={{ color: showBase ? "#0f766e" : undefined }}>
          {formatMoney(pricing.effectivePrice)}
        </Typography.Text>
        {showBase && (
          <Typography.Text delete type="secondary" style={{ fontSize: compact ? 11 : 12 }}>
            {formatMoney(pricing.basePrice)}
          </Typography.Text>
        )}
      </div>
      {pricing.matchedTier && (
        <Tag color={pricing.matchedTier ? "cyan" : "green"} bordered={false} style={{ marginTop: 4 }}>
          Desde {pricing.matchedTier.minQuantity}
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
