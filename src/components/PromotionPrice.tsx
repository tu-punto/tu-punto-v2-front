import { Button, Modal, Popover, Space, Tag, Typography } from "antd";
import { useState, type MouseEvent } from "react";
import { formatMoney, resolvePromotionPricing, type PromotionPricingLike } from "../utils/promotionPricing";
import { useMediaQuery } from "../hooks/useMediaQuery";

type Props = {
  basePrice?: number | null;
  price?: number | null;
  promotion?: PromotionPricingLike;
  quantity?: number;
  compact?: boolean;
  showTierBadge?: boolean;
  onConditionalAccept?: (accepted: boolean) => void;
};

type ConditionalPromotionDetailsProps = {
  accepted?: boolean;
  question?: string;
  title?: string;
  label?: string;
  color?: string;
  pendingText?: string;
  confirmedText?: string;
  acceptText?: string;
  rejectText?: string;
  onDecision?: (accepted: boolean) => void;
};

export const ConditionalPromotionDetails = ({
  accepted = false,
  question,
  title = "Promocion condicional",
  label = "Promo",
  color = "magenta",
  pendingText = "Pendiente de confirmar",
  confirmedText = "Confirmada",
  acceptText = "Si",
  rejectText = "No",
  onDecision,
}: ConditionalPromotionDetailsProps) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [open, setOpen] = useState(false);

  const handleDecision = (value: boolean) => {
    onDecision?.(value);
    if (isMobile) {
      setOpen(false);
    }
  };

  const stopPropagation = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const content = (
    <div style={{ minWidth: 180 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
        <div style={{ marginBottom: 8 }}>{question || "Esta promo requiere confirmacion manual."}</div>
        <div style={{ fontWeight: 700, color: accepted ? "#0f766e" : "#7c3aed" }}>
          {accepted ? confirmedText : pendingText}
        </div>
        {onDecision && (
          <Space style={{ marginTop: 10 }}>
            <Button size="small" type="primary" onClick={() => handleDecision(true)}>
              {acceptText}
            </Button>
            <Button size="small" onClick={() => handleDecision(false)}>
              {rejectText}
            </Button>
          </Space>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Tag
          bordered={false}
          color={color}
          style={{
            marginInlineEnd: 0,
            cursor: "pointer",
            borderRadius: 999,
            paddingInline: 10,
            fontSize: 11,
          }}
          onClick={(event) => {
            stopPropagation(event);
            setOpen(true);
          }}
        >
          {label}
        </Tag>
        <Modal
          open={open}
          onCancel={() => setOpen(false)}
          footer={null}
          title={title}
          destroyOnClose
          centered
          width="calc(100vw - 24px)"
        >
          {content}
        </Modal>
      </>
    );
  }

  return (
    <Popover content={content} trigger={["hover", "click"]} placement="topLeft" overlayStyle={{ maxWidth: 240 }}>
      <Tag
        bordered={false}
        color={color}
        style={{
          marginInlineEnd: 0,
          cursor: "pointer",
          borderRadius: 999,
          paddingInline: 10,
          fontSize: 11,
        }}
        onClick={stopPropagation}
      >
        {label}
      </Tag>
    </Popover>
  );
};

const PromotionPrice = ({
  basePrice,
  price,
  promotion,
  quantity = 1,
  compact = false,
  showTierBadge = false,
  onConditionalAccept,
}: Props) => {
  const pricing = resolvePromotionPricing(basePrice ?? price ?? 0, promotion ?? price ?? null, quantity);
  const showBase = pricing.hasPromotion && pricing.basePrice > pricing.effectivePrice;
  const showScaleBadge = showTierBadge && pricing.tiers.length > 0;
  const isConditional = pricing.pricingMode === "conditional";
  const matchedTierKey = pricing.matchedTier
    ? `${pricing.matchedTier.minQuantity}-${pricing.matchedTier.unitPrice}`
    : null;

  const tierPopoverContent = isConditional ? null : (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 180 }}>
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
        {isConditional && (
          <ConditionalPromotionDetails
            accepted={pricing.conditionalAccepted}
            question={pricing.conditionalQuestion || undefined}
            onDecision={onConditionalAccept}
            color="magenta"
            label="Promo"
            acceptText="Si"
            rejectText="No"
          />
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
