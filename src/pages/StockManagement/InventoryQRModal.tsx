import { useEffect, useMemo, useState } from "react";
import { Button, Empty, InputNumber, Modal, Table, Typography } from "antd";
import { FileExcelOutlined, ReloadOutlined } from "@ant-design/icons";

import { downloadInventoryQRReportAPI } from "../../api/product";
import QRScanner from "../Sales/QRScanner";
import { buildVariantEntryKey, getVariantLabel, toVariantRecord } from "./variantScanUtils";

const { Text, Title } = Typography;

type InventoryRow = {
  key: string;
  productId: string;
  sellerId: string;
  productName: string;
  categoryName: string;
  variantKey?: string;
  variantLabel: string;
  variantes: Record<string, string>;
  sucursalId?: string;
  precio?: number;
  systemStock: number;
  countedStock: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  sellerLabel?: string;
  sucursalId?: string;
  sucursalLabel?: string;
};

const normalizeNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const InventoryQRModal = ({
  open,
  onClose,
  sucursalId,
  sucursalLabel
}: Props) => {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [scannerVisible, setScannerVisible] = useState(true);
  const [scannerSession, setScannerSession] = useState(0);
  const [successPulse, setSuccessPulse] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const isCompactLayout = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    if (!open) {
      setRows([]);
      setScannerVisible(true);
      setScannerSession(0);
      setSuccessPulse(false);
      setReportLoading(false);
      return;
    }

    setRows([]);
    setScannerVisible(true);
    setScannerSession((current) => current + 1);
    setSuccessPulse(false);
  }, [open]);

  const totalCountedUnits = useMemo(
    () => rows.reduce((acc, row) => acc + normalizeNumber(row.countedStock), 0),
    [rows]
  );

  const totalDifferenceUnits = useMemo(
    () => rows.reduce((acc, row) => acc + (normalizeNumber(row.countedStock) - normalizeNumber(row.systemStock)), 0),
    [rows]
  );

  const handleRestartScanner = () => {
    setScannerVisible(false);
    window.setTimeout(() => {
      setScannerVisible(true);
      setScannerSession((current) => current + 1);
    }, 0);
  };

  const handleScannedVariant = (item: any) => {
    const entryKey = buildVariantEntryKey({
      productId: item?.id_producto,
      variantKey: item?.variantKey,
      variantes: item?.variantes
    });
    const variantLabel = item?.variantLabel || getVariantLabel(toVariantRecord(item?.variantes));
    setSuccessPulse(true);
    window.setTimeout(() => setSuccessPulse(false), 650);

    setRows((current) => {
      const index = current.findIndex((row) => row.key === entryKey);
      if (index >= 0) {
        const next = [...current];
        const updatedRow = {
          ...next[index],
          countedStock: normalizeNumber(next[index].countedStock) + 1
        };
        next.splice(index, 1);
        return [updatedRow, ...next];
      }

      return [
        {
          key: entryKey,
          productId: String(item?.id_producto || ""),
          sellerId: String(item?.id_vendedor || ""),
          productName: String(item?.nombre_producto || "Producto"),
          categoryName: String(item?.nombre_categoria || item?.categoria || "Sin categoria"),
          variantKey: String(item?.variantKey || ""),
          variantLabel: variantLabel || "Variante",
          variantes: toVariantRecord(item?.variantes),
          sucursalId: String(item?.sucursalId || sucursalId || ""),
          precio: normalizeNumber(item?.precio),
          systemStock: normalizeNumber(item?.stock),
          countedStock: 1
        },
        ...current
      ];
    });
  };

  const handleCountedStockChange = (record: InventoryRow, value: number | null) => {
    const nextValue = Math.max(0, normalizeNumber(value));
    setRows((current) =>
      current.map((row) => (row.key === record.key ? { ...row, countedStock: nextValue } : row))
    );
  };

  const handleResetRow = (record: InventoryRow) => {
    setRows((current) => current.filter((row) => row.key !== record.key));
  };

  const handleDownloadReport = async () => {
    if (!sucursalId || sucursalId === "all") return;
    setReportLoading(true);
    try {
      await downloadInventoryQRReportAPI({
        sucursalId,
        sucursalLabel,
        rows: rows.map((row) => ({
          productId: row.productId,
          productName: row.productName,
          categoryName: row.categoryName,
          variantKey: row.variantKey,
          variantLabel: row.variantLabel,
          variantes: row.variantes,
          sellerId: row.sellerId,
          sucursalId: row.sucursalId || sucursalId,
          sucursalLabel,
          precio: row.precio,
          systemStock: row.systemStock,
          countedStock: row.countedStock
        }))
      });
    } finally {
      setReportLoading(false);
    }
  };

  const isReady = Boolean(sucursalId && sucursalId !== "all");

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={isCompactLayout ? "96%" : 1100}
      destroyOnClose
      title="Inventario QR por sucursal"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-start"
          }}
        >
          <div>
            <Title level={5} style={{ margin: 0 }}>
              Conteo QR
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {sucursalLabel || "Sucursal actual"}
            </Text>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button icon={<ReloadOutlined />} onClick={handleRestartScanner} disabled={!isReady}>
              Reiniciar escaner
            </Button>
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={handleDownloadReport}
              disabled={!isReady}
              loading={reportLoading}
            >
              Descargar reporte Excel
            </Button>
          </div>
        </div>

        {!isReady ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Selecciona una sucursal para iniciar el inventario QR."
          />
        ) : (
          <>
            {scannerVisible && (
              <div
                style={{
                  maxWidth: 720,
                  marginInline: "auto",
                  width: "100%",
                  border: successPulse ? "3px solid #52c41a" : "3px solid transparent",
                  borderRadius: 16,
                  boxShadow: successPulse ? "0 0 0 4px rgba(82, 196, 26, 0.14)" : "none",
                  transition: "border-color 0.12s ease, box-shadow 0.12s ease"
                }}
              >
                <QRScanner
                  key={`inventory-qr-${scannerSession}`}
                  onProductScanned={handleScannedVariant}
                  onClose={() => setScannerVisible(false)}
                  title="Escaner QR de inventario"
                  description="Cada lectura suma una unidad al conteo fisico de la variante."
                  successLabel="Unidad contada"
                  groupSuccessLabel="Unidad del grupo contada"
                  appearance="simple"
                  simpleVideoMinHeight={isCompactLayout ? 220 : 260}
                  sucursalId={sucursalId}
                />
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                fontSize: 12,
                color: "#4b5563",
                padding: "4px 2px"
              }}
            >
              <span>Variantes contadas: {rows.length}</span>
              <span>Unidades escaneadas: {totalCountedUnits}</span>
              <span style={{ color: totalDifferenceUnits === 0 ? "#4b5563" : totalDifferenceUnits > 0 ? "#237804" : "#cf1322" }}>
                Diferencia total: {totalDifferenceUnits > 0 ? `+${totalDifferenceUnits}` : totalDifferenceUnits}
              </span>
            </div>

            {rows.length > 0 ? (
              <Table
                dataSource={rows}
                rowKey="key"
                pagination={{ pageSize: isCompactLayout ? 5 : 8, showSizeChanger: false }}
                scroll={{ x: "max-content" }}
                columns={[
                  {
                    title: "Producto",
                    render: (_: any, record: InventoryRow) => `${record.productName} - ${record.variantLabel}`
                  },
                  {
                    title: "Stock sistema",
                    dataIndex: "systemStock",
                    render: (value: number) => <Text>{normalizeNumber(value)}</Text>
                  },
                  {
                    title: "Contado",
                    render: (_: any, record: InventoryRow) => (
                      <InputNumber
                        min={0}
                        value={normalizeNumber(record.countedStock)}
                        onChange={(value) => handleCountedStockChange(record, value)}
                        style={{ width: 100 }}
                      />
                    )
                  },
                  {
                    title: "Diferencia",
                    render: (_: any, record: InventoryRow) => {
                      const difference = normalizeNumber(record.countedStock) - normalizeNumber(record.systemStock);
                      return (
                        <Text strong style={{ color: difference === 0 ? "#595959" : difference > 0 ? "#237804" : "#cf1322" }}>
                          {difference > 0 ? `+${difference}` : difference}
                        </Text>
                      );
                    }
                  },
                  {
                    title: "Acciones",
                    render: (_: any, record: InventoryRow) => (
                      <Button size="small" onClick={() => handleResetRow(record)}>
                        Quitar
                      </Button>
                    )
                  }
                ]}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Escanea variantes para comenzar el conteo de inventario."
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default InventoryQRModal;
