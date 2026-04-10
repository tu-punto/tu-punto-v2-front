export const normalizeText = (value: unknown) => String(value ?? "").trim();

export const normalizeId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    return String(value?._id || value?.id_sucursal || value?.$oid || value?.id || value?.toString?.() || "");
  }
  return String(value);
};

export const toVariantRecord = (input: any): Record<string, string> => {
  if (!input || typeof input !== "object") return {};

  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [normalizeText(key), normalizeText(value)])
      .filter(([key, value]) => key && value)
  );
};

export const areVariantsEqual = (left: any, right: any) => {
  const a = toVariantRecord(left);
  const b = toVariantRecord(right);
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length === 0 || aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => normalizeText(a[key]).toLowerCase() === normalizeText(b[key]).toLowerCase());
};

export const getVariantLabel = (variantes: Record<string, string>) =>
  Object.values(toVariantRecord(variantes))
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(" / ");

export const buildVariantEntryKey = (params: {
  productId?: string;
  variantKey?: string;
  variantes?: Record<string, string>;
}) => {
  const productId = normalizeText(params.productId);
  const variantKey = normalizeText(params.variantKey);
  const variantHash = JSON.stringify(toVariantRecord(params.variantes || {}));
  return `${productId}::${variantKey || variantHash}`;
};

export const findVariantCombination = ({
  product,
  preferredSucursalId,
  variantKey,
  variantes
}: {
  product: any;
  preferredSucursalId?: string;
  variantKey?: string;
  variantes?: Record<string, string>;
}) => {
  const normalizedPreferredSucursalId = normalizeId(preferredSucursalId);
  const normalizedVariantKey = normalizeText(variantKey);
  const normalizedVariants = toVariantRecord(variantes || {});
  const branches = Array.isArray(product?.sucursales) ? product.sucursales : [];

  const orderedBranches = normalizedPreferredSucursalId
    ? [
        ...branches.filter((branch: any) => normalizeId(branch?.id_sucursal) === normalizedPreferredSucursalId),
        ...branches.filter((branch: any) => normalizeId(branch?.id_sucursal) !== normalizedPreferredSucursalId)
      ]
    : branches;

  for (const branch of orderedBranches) {
    const combinations = Array.isArray(branch?.combinaciones) ? branch.combinaciones : [];
    const combination = combinations.find((candidate: any) => {
      const candidateVariantKey = normalizeText(candidate?.variantKey);
      if (normalizedVariantKey && candidateVariantKey && candidateVariantKey === normalizedVariantKey) {
        return true;
      }

      return areVariantsEqual(candidate?.variantes, normalizedVariants);
    });

    if (combination) {
      return {
        branch,
        combination
      };
    }
  }

  return {
    branch: null,
    combination: null
  };
};
