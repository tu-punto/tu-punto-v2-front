import { Popover, Tag, Typography } from "antd";
import { formatMoney, resolvePromotionPricing, type PromotionPricingLike } from "../utils/promotionPricing";

type Props = {
  basePrice?: number | null;
  price?: number | null;
  promotion?: PromotionPricingLike;
  quantity?: number;
  compact?: boolean;
  showTierBadge?: boolean;
};

const PromotionPrice = ({
  basePrice,
  price,
  promotion,
  quantity = 1,
  compact = false,
  showTierBadge = false,
}: Props) => {
  const pricing = resolvePromotionPricing(basePrice ?? price ?? 0, promotion ?? price ?? null, quantity);
  const showBase = pricing.hasPromotion && pricing.basePrice > pricing.effectivePrice;
  const showScaleBadge = showTierBadge && pricing.tiers.length > 0;
  const matchedTierKey = pricing.matchedTier
    ? `${pricing.matchedTier.minQuantity}-${pricing.matchedTier.unitPrice}`
    : null;

  const tierPopoverContent = (
    <div style={{ minWidth: 180 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>
        Escalas de promoción
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {pricing.tiers.map((tier) => {
          const tierKey = `${tier.minQuantity}-${tier.unitPrice}`;
          const isActiveTier = tierKey === matchedTierKey;

          return (
            <div
              key={tierKey}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "6px 8px",
                borderRadius: 10,
                background: isActiveTier ? "rgba(16, 185, 129, 0.10)" : "rgba(148, 163, 184, 0.08)",
              }}
            >
              <span style={{ fontSize: 12, color: "#334155" }}>
                Desde <strong>{tier.minQuantity}</strong> unidades
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: isActiveTier ? "#0f766e" : "#0f172a" }}>
                {formatMoney(tier.unitPrice)}
              </span>
            </div>
          );
        })}
      </div>
      {pricing.matchedTier && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#0f766e" }}>
          Se aplica con {quantity} unidad{quantity === 1 ? "" : "es"} en el carrito.
        </div>
      )}
    </div>
  );

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
        {showScaleBadge && (
          <Popover
            content={tierPopoverContent}
            trigger={["hover", "click"]}
            placement="topLeft"
            overlayStyle={{ maxWidth: 240 }}
          >
            <Tag
              bordered={false}
              color={pricing.matchedTier ? "cyan" : "blue"}
              style={{
                marginInlineEnd: 0,
                cursor: "pointer",
                borderRadius: 999,
                paddingInline: 10,
                fontSize: 11,
              }}
            >
              {pricing.matchedTier ? `Escala ${pricing.matchedTier.minQuantity}+` : "Promo por cantidad"}
            </Tag>
          </Popover>
        )}
      </div>
      {pricing.matchedTier && !showScaleBadge && (
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
