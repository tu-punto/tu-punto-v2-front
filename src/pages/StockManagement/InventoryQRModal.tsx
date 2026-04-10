import { useEffect, useMemo, useState } from "react";
import { Button, Empty, InputNumber, Modal, Table, Typography, message } from "antd";
import { CheckOutlined, ReloadOutlined } from "@ant-design/icons";

import QRScanner from "../Sales/QRScanner";
import { buildVariantEntryKey, getVariantLabel, toVariantRecord } from "./variantScanUtils";

const { Text, Title } = Typography;

type InventoryRow = {
  key: string;
  productId: string;
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
  sellerId?: string | null;
  sellerLabel?: string;
  sucursalId?: string;
  sucursalLabel?: string;
  onUseDifferences?: (draft: any[]) => void;
};

const normalizeNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const InventoryQRModal = ({
  open,
  onClose,
  sellerId,
  sellerLabel,
  sucursalId,
  sucursalLabel,
  onUseDifferences
}: Props) => {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [scannerVisible, setScannerVisible] = useState(true);
  const [scannerSession, setScannerSession] = useState(0);

  useEffect(() => {
    if (!open) {
      setRows([]);
      setScannerVisible(true);
      setScannerSession(0);
      return;
    }

    setRows([]);
    setScannerVisible(true);
    setScannerSession((current) => current + 1);
  }, [open]);

  const totalCountedUnits = useMemo(
    () => rows.reduce((acc, row) => acc + normalizeNumber(row.countedStock), 0),
    [rows]
  );

  const totalDifferenceUnits = useMemo(
    () => rows.reduce((acc, row) => acc + (normalizeNumber(row.countedStock) - normalizeNumber(row.systemStock)), 0),
    [rows]
  );

  const rowsWithDifference = useMemo(
    () => rows.filter((row) => normalizeNumber(row.countedStock) !== normalizeNumber(row.systemStock)),
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
    if (sellerId && String(item?.id_vendedor || "") !== String(sellerId)) {
      message.error("El QR escaneado no pertenece al vendedor seleccionado.");
      return;
    }

    const entryKey = buildVariantEntryKey({
      productId: item?.id_producto,
      variantKey: item?.variantKey,
      variantes: item?.variantes
    });
    const variantLabel = item?.variantLabel || getVariantLabel(toVariantRecord(item?.variantes));

    setRows((current) => {
      const index = current.findIndex((row) => row.key === entryKey);
      if (index >= 0) {
        const next = [...current];
        next[index] = {
          ...next[index],
          countedStock: normalizeNumber(next[index].countedStock) + 1
        };
        return next;
      }

      return [
        ...current,
        {
          key: entryKey,
          productId: String(item?.id_producto || ""),
          productName: String(item?.nombre_producto || "Producto"),
          categoryName: String(item?.nombre_categoria || item?.categoria || "Sin categoria"),
          variantKey: String(item?.variantKey || ""),
          variantLabel: variantLabel || "Variante",
          variantes: toVariantRecord(item?.variantes),
          sucursalId: String(item?.sucursalId || sucursalId || ""),
          precio: normalizeNumber(item?.precio),
          systemStock: normalizeNumber(item?.stock),
          countedStock: 1
        }
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

  const handleUseDifferences = () => {
    const draft = rowsWithDifference.map((row) => ({
      product: {
        _id: row.productId,
        nombre_producto: row.productName,
        nombre_categoria: row.categoryName,
        categoria: row.categoryName,
        variantes: row.variantes,
        variantKey: row.variantKey,
        variantLabel: row.variantLabel,
        precio: row.precio,
        stock: row.systemStock,
        sucursalId: row.sucursalId || sucursalId
      },
      newStock: {
        productId: row.productId,
        sucursalId: row.sucursalId || sucursalId,
        stock: normalizeNumber(row.countedStock) - normalizeNumber(row.systemStock)
      }
    }));

    onUseDifferences?.(draft);
  };

  const isReady = Boolean(sellerId && sucursalId && sucursalId !== "all");

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1100}
      destroyOnClose
      title="Inventario por sucursal con QR"
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
              {sellerLabel || "Vendedor"} | {sucursalLabel || "Sucursal actual"}
            </Text>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button icon={<ReloadOutlined />} onClick={handleRestartScanner} disabled={!isReady}>
              Reiniciar escaner
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleUseDifferences}
              disabled={!rowsWithDifference.length}
            >
              Enviar diferencias a actualizar stock
            </Button>
          </div>
        </div>

        {!isReady ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Selecciona un vendedor y una sucursal para iniciar el inventario QR."
          />
        ) : (
          <>
            {scannerVisible && (
              <div style={{ maxWidth: 720, marginInline: "auto", width: "100%" }}>
                <QRScanner
                  key={`inventory-qr-${scannerSession}`}
                  onProductScanned={handleScannedVariant}
                  onClose={() => setScannerVisible(false)}
                  title="Escaner QR de inventario"
                  description="Cada lectura suma una unidad al conteo fisico de la variante."
                  successLabel="Unidad contada"
                  groupSuccessLabel="Unidad del grupo contada"
                  appearance="simple"
                  simpleVideoMinHeight={240}
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
                pagination={{ pageSize: 8, showSizeChanger: false }}
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
