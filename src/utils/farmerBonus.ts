export const getFarmerUnitBonus = (price: number, rules: any[]): number | null => {
  const rule = rules.find((item) =>
    price >= Number(item?.limite_inferior || 0) && price <= Number(item?.limite_superior || 0)
  );
  if (!rule) return null;
  return Math.max(0, Number(rule.bono_granjero ?? (Number(rule.monto_descontado || 0) - Number(rule.monto_para_tu_punto || 0))));
};
