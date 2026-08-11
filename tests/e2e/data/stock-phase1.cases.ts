export type StockSearchCase = {
  name: string;
  sellerName: string;
  categoryName: string;
  searchTerm: string;
  expectedProduct: string;
};

export type StockEmptySearchCase = {
  name: string;
  sellerName: string;
  emptySearchTerm: string;
};

export type StockPaginationCase = {
  name: string;
  sellerName: string;
  page2ExpectedProduct: string;
};

export type StockUpdateCase = {
  name: string;
  sellerName: string;
  existingProduct: string;
  existingVariant: string;
  updateDelta: number;
};

export type StockCreateProductCase = {
  name: string;
  sellerName: string;
  categoryName: string;
  variantName: string;
  variantValue: string;
  initialStock: number;
  initialPrice: number;
};

export const stockPhase1Cases = {
  searches: [
    {
      name: "Busqueda por nombre corto",
      sellerName: "Alvaro Carreras",
      categoryName: "Ropa",
      searchTerm: "Polo",
      expectedProduct: "Polo estilo Zara",
    },
    {
      name: "Busqueda por nombre completo",
      sellerName: "Alvaro Carreras",
      categoryName: "Ropa",
      searchTerm: "Polo estilo Zara",
      expectedProduct: "Polo estilo Zara",
    },
  ] satisfies StockSearchCase[],

  emptySearches: [
    {
      name: "Busqueda inexistente principal",
      sellerName: "Alvaro Carreras",
      emptySearchTerm: "producto-inexistente-e2e-001",
    },
  ] satisfies StockEmptySearchCase[],

  paginations: [
    {
      name: "Paginacion pagina dos principal",
      sellerName: "Alvaro Carreras",
      page2ExpectedProduct: "prueba auditoria",
    },
  ] satisfies StockPaginationCase[],

  stockUpdates: [
    {
      name: "Incrementar stock en una unidad",
      sellerName: "Alvaro Carreras",
      existingProduct: "Polo estilo Zara",
      existingVariant: "Polo estilo Zara",
      updateDelta: 1,
    },
  ] satisfies StockUpdateCase[],

  productCreations: [
    {
      name: "Alta producto color rojo",
      sellerName: "Alvaro Carreras",
      categoryName: "Ropa",
      variantName: "Color",
      variantValue: "Rojo E2E",
      initialStock: 2,
      initialPrice: 25,
    },
  ] satisfies StockCreateProductCase[],
};
