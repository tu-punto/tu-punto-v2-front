export const normalizeSearchText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const includesNormalized = (value: unknown, query: unknown) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return normalizeSearchText(value).includes(normalizedQuery);
};

export const matchesAllSearchWords = (value: unknown, query: unknown) => {
  const words = normalizeSearchText(query)
    .split(/\s+/)
    .filter((word) => word && !/[!@#$%^&*?:{}|<>]/.test(word));

  return words.every((word) => includesNormalized(value, word));
};
