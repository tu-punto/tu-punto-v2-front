import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import logoSvg from "../../assets/tupunto-logo-orange.svg?raw";

export const EXTERNAL_PACKAGE_TEMPLATE_FIELDS = [
  { key: "carnet_vendedor", label: "Tu Carnet" },
  { key: "vendedor", label: "Tu Nombre" },
  { key: "telefono_vendedor", label: "Tu Celular" },
  { key: "comprador", label: "Nombre del comprador" },
  { key: "telefono_comprador", label: "Celular del comprador" },
  { key: "descripcion_paquete", label: "Descripcion del paquete" },
  { key: "destino_sucursal", label: "Sucursal destino" },
] as const;

const LEGACY_TEMPLATE_LABELS = ["Carnet del vendedor", "Nombre del vendedor", "Celular del vendedor"] as const;

const TEMPLATE_LABELS = EXTERNAL_PACKAGE_TEMPLATE_FIELDS.map((field) => field.label);

const HEADER_GROUPS = [
  ["Tu Carnet", "Carnet del vendedor"],
  ["Tu Nombre", "Nombre del vendedor"],
  ["Tu Celular", "Celular del vendedor"],
  ["Nombre del comprador"],
  ["Celular del comprador"],
  ["Descripcion del paquete"],
  ["Sucursal destino"]
] as const;

export type ImportedExternalPackageRow = {
  rowNumber: number;
  carnet_vendedor: string;
  vendedor: string;
  telefono_vendedor: string;
  comprador: string;
  telefono_comprador: string;
  descripcion_paquete: string;
  destino_sucursal: string;
  delivery_spaces: number;
  esta_pagado: "si" | "no" | "mixto" | "";
  metodo_pago: "efectivo" | "qr" | "";
};

const normalizeText = (value: unknown) => String(value ?? "").trim();

const normalizeHeader = (value: unknown) =>
  normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

const isRowBlank = (row: unknown[]) => row.every((value) => normalizeText(value) === "");

const readWorkbook = async (file: File) => {
  const ext = file.name.split(".").pop()?.trim().toLowerCase();
  if (!ext || !["xlsx", "csv"].includes(ext)) {
    throw new Error("Solo se permiten archivos .xlsx o .csv");
  }

  if (ext === "csv") {
    const text = await file.text();
    return XLSX.read(text, { type: "string" });
  }

  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: "array" });
};

const svgToPngBase64 = async (svg: string) => {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);

  try {
    const image = new Image();
    const loadImage = new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("No se pudo cargar el logo de la plantilla"));
    });

    image.src = url;
    const loadedImage = await loadImage;
    const scale = 3;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(loadedImage.width * scale);
    canvas.height = Math.ceil(loadedImage.height * scale);

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("No se pudo preparar el banner de la plantilla");
    }

    context.scale(scale, scale);
    context.drawImage(loadedImage, 0, 0);
    return canvas.toDataURL("image/png").split(",")[1] ?? "";
  } finally {
    window.URL.revokeObjectURL(url);
  }
};

export const downloadExternalPackagesTemplate = async (branches: { id: string; name: string }[] = []) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tu Punto";
  workbook.created = new Date();
  const homeUrl = "https://www.tu-punto.com/";

  const templateSheet = workbook.addWorksheet("Plantilla");
  const branchSheet = workbook.addWorksheet("Listas");
  branchSheet.state = "hidden";

  templateSheet.columns = TEMPLATE_LABELS.map((label) => ({
    width: Math.max(16, Math.min(32, label.length + 8))
  }));

  const bannerRow = templateSheet.getRow(1);
  bannerRow.height = 44;
  for (let columnIndex = 1; columnIndex <= TEMPLATE_LABELS.length; columnIndex += 1) {
    templateSheet.getCell(1, columnIndex).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0B4F8A" }
    };
  }

  templateSheet.mergeCells("E1:G1");
  const titleCell = templateSheet.getCell("E1");
  titleCell.value = "Plantilla de Entregas Externas";
  titleCell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 14 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  templateSheet.getCell("A1").value = {
    text: ".",
    hyperlink: homeUrl,
    tooltip: "Ir a tu-punto.com"
  };
  templateSheet.getCell("A1").font = { color: { argb: "FF0B4F8A" }, bold: true };
  templateSheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  const logoImageId = workbook.addImage({
    base64: await svgToPngBase64(logoSvg),
    extension: "png"
  });
  templateSheet.addImage(logoImageId, {
    tl: { col: 0.15, row: 0.08 },
    ext: { width: 155, height: 48 },
    hyperlinks: { hyperlink: homeUrl, tooltip: "Ir a tu-punto.com" }
  });

  const headerRow = templateSheet.getRow(2);
  headerRow.height = 24;
  TEMPLATE_LABELS.forEach((label, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B4F8A" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFBAE6FD" } },
      bottom: { style: "thin", color: { argb: "FFBAE6FD" } },
      left: { style: "thin", color: { argb: "FFBAE6FD" } },
      right: { style: "thin", color: { argb: "FFBAE6FD" } }
    };
  });

  const exampleRow = templateSheet.addRow([
    "1234567",
    "Juan Perez",
    "71234567",
    "Maria Lopez",
    "70000000",
    "Pedido de prueba",
    branches[0]?.name || "Seleccionar desde lista"
  ]);
  exampleRow.eachCell((cell, columnNumber) => {
    cell.font = { italic: true, color: { argb: "FF475569" } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: columnNumber === 7 ? "FFE0F2FE" : "FFF8FAFC" }
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } }
    };
  });

  for (let rowIndex = 4; rowIndex <= 1000; rowIndex += 1) {
    for (let columnIndex = 1; columnIndex <= 3; columnIndex += 1) {
      const cell = templateSheet.getCell(rowIndex, columnIndex);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAF7" } };
      cell.font = { color: { argb: "FF0F172A" }, italic: true };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.protection = { locked: true };
    }
  }

  for (let columnIndex = 1; columnIndex <= 3; columnIndex += 1) {
    templateSheet.getCell(3, columnIndex).protection = { locked: false };
  }

  for (let rowIndex = 3; rowIndex <= 1000; rowIndex += 1) {
    for (let columnIndex = 4; columnIndex <= 7; columnIndex += 1) {
      templateSheet.getCell(rowIndex, columnIndex).protection = { locked: false };
    }
  }

  for (let rowIndex = 1; rowIndex <= 1000; rowIndex += 1) {
    for (let columnIndex = 8; columnIndex <= 20; columnIndex += 1) {
      templateSheet.getCell(rowIndex, columnIndex).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFFFF" }
      };
    }
  }

  templateSheet.getColumn(1).numFmt = "@";
  templateSheet.getColumn(3).numFmt = "@";
  templateSheet.getColumn(5).numFmt = "@";

  for (let rowIndex = 3; rowIndex <= 1000; rowIndex += 1) {
    templateSheet.getCell(`A${rowIndex}`).numFmt = "@";
    templateSheet.getCell(`C${rowIndex}`).numFmt = "@";
    templateSheet.getCell(`E${rowIndex}`).numFmt = "@";
  }

  branchSheet.columns = [{ header: "Sucursal destino", key: "name", width: 32 }];
  branches.forEach((branch) => branchSheet.addRow([branch.name]));

  const branchListEnd = Math.max(branches.length + 1, 2);
  for (let rowIndex = 3; rowIndex <= 1000; rowIndex += 1) {
    templateSheet.getCell(`G${rowIndex}`).dataValidation = {
      type: "list",
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Sucursal invalida",
      error: "Debes elegir una sucursal de la lista desplegable.",
      formulae: [`'Listas'!$A$2:$A$${branchListEnd}`]
    };
  }

  templateSheet.views = [{ state: "frozen", ySplit: 2 }];

  await templateSheet.protect("tu-punto", {
    objects: false,
    scenarios: false,
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    autoFilter: false,
    pivotTables: false
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "plantilla_entregas_externas.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const parseExternalPackagesFile = async (file: File) => {
  const workbook = await readWorkbook(file);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("El archivo no tiene hojas para importar");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: true
  }) as unknown[][];

  if (!rows.length) {
    throw new Error("La plantilla esta vacia");
  }

  const headerRowIndex = rows.findIndex((row) => {
    const normalizedRow = row.map(normalizeHeader);
    return HEADER_GROUPS.every((group) => group.some((label) => normalizedRow.includes(normalizeHeader(label))));
  });

  if (headerRowIndex === -1) {
    throw new Error(
      `La plantilla debe incluir estas columnas: ${TEMPLATE_LABELS.join(", ")}`
    );
  }

  const headerRow = rows[headerRowIndex].map(normalizeHeader);
  const headerIndexes = new Map<string, number>();
  headerRow.forEach((header, index) => {
    if (header) headerIndexes.set(header, index);
  });

  const missingHeaders = HEADER_GROUPS.filter((group) => !group.some((label) => headerIndexes.has(normalizeHeader(label))));
  if (missingHeaders.length > 0) {
    throw new Error(
      `La plantilla debe incluir estas columnas: ${TEMPLATE_LABELS.join(", ")}`
    );
  }

  const dataRows = rows.slice(headerRowIndex + 1).filter((row) => !isRowBlank(row));
  if (!dataRows.length) {
    throw new Error("Agrega al menos una fila de paquetes en la plantilla");
  }

  const getValue = (row: unknown[], label: string) => row[headerIndexes.get(normalizeHeader(label)) ?? -1];
  const getValueByLabels = (row: unknown[], labels: string[]) => {
    for (const label of labels) {
      const value = getValue(row, label);
      if (normalizeText(value)) return value;
    }
    return "";
  };

  return dataRows.map((row, index) => ({
    rowNumber: headerRowIndex + index + 2,
    carnet_vendedor: normalizeText(getValueByLabels(row, ["Tu Carnet", "Carnet del vendedor"])),
    vendedor: normalizeText(getValueByLabels(row, ["Tu Nombre", "Nombre del vendedor"])),
    telefono_vendedor: normalizeText(getValueByLabels(row, ["Tu Celular", "Celular del vendedor"])),
    comprador: normalizeText(getValue(row, "Nombre del comprador")),
    telefono_comprador: normalizeText(getValue(row, "Celular del comprador")),
    descripcion_paquete: normalizeText(getValue(row, "Descripcion del paquete")),
    destino_sucursal: normalizeText(getValue(row, "Sucursal destino")),
    delivery_spaces: 1,
    esta_pagado: "",
    metodo_pago: "efectivo"
  })) as ImportedExternalPackageRow[];
};
