import { Button, Empty, Input, Modal, Select, Space, Spin, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  deleteSimplePackageAPI,
  getSimplePackagesListAPI,
  getUploadedSimplePackageSellersAPI,
  updateSimplePackageAPI,
} from "../../api/simplePackage";
import { applyPackagePatch, calculateSimplePackageTotals } from "../SimplePackages/simplePackageHelpers";

interface SimplePackageManagerModalProps {
  visible: boolean;
  onClose: () => void;
}

const tableCellStyle: React.CSSProperties = {
  border: "1px solid #d9d9d9",
  padding: 6,
  verticalAlign: "top",
};

const readonlyBuyerStyle: React.CSSProperties = {
  background: "#fff2e8",
  borderColor: "#ffbb96",
};

const summaryCardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  padding: "10px 12px",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
};

const SimplePackageManagerModal = ({ visible, onClose }: SimplePackageManagerModalProps) => {
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [sellerRows, setSellerRows] = useState<any[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [savingRowIds, setSavingRowIds] = useState<string[]>([]);
  const [savingGeneralPayment, setSavingGeneralPayment] = useState(false);

  const totals = useMemo(() => calculateSimplePackageTotals(rows), [rows]);
  const generalPaymentMethod = useMemo(() => {
    if (!rows.length) return "";
    const paidRows = rows.filter((row) => row.esta_pagado === "si");
    if (!paidRows.length) return "";
    const firstMethod = String(paidRows[0]?.metodo_pago || "");
    if (!firstMethod) return "";
    return paidRows.every((row) => String(row.metodo_pago || "") === firstMethod) ? firstMethod : "mixed";
  }, [rows]);

  const fetchSellers = async () => {
    setLoadingSellers(true);
    try {
      const response = await getUploadedSimplePackageSellersAPI();
      const nextRows = Array.isArray(response?.rows) ? response.rows : [];
      setSellerRows(nextRows);
      setSelectedSellerId((prev) => {
        if (nextRows.some((seller) => String(seller._id) === String(prev))) {
          return prev;
        }
        return String(nextRows[0]?._id || "");
      });
    } catch (error) {
      console.error(error);
      message.error("No se pudo cargar la lista de vendedores");
    } finally {
      setLoadingSellers(false);
    }
  };

  const fetchPackages = async (sellerId: string) => {
    if (!sellerId) {
      setRows([]);
      return;
    }

    setLoadingRows(true);
    try {
      const response = await getSimplePackagesListAPI({ sellerId });
      setRows(Array.isArray(response?.rows) ? response.rows : []);
    } catch (error) {
      console.error(error);
      message.error("No se pudieron cargar los paquetes");
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    fetchSellers();
  }, [visible]);

  useEffect(() => {
    if (!visible || !selectedSellerId) return;
    fetchPackages(selectedSellerId);
  }, [visible, selectedSellerId]);

  const commitRowPatch = async (rowId: string, patch: Record<string, unknown>) => {
    const previousRows = rows;
    const optimisticRows = rows.map((row) => (row._id === rowId ? applyPackagePatch(row, patch) : row));
    setRows(optimisticRows);
    setSavingRowIds((prev) => [...prev, rowId]);

    try {
      const response = await updateSimplePackageAPI(rowId, patch);
      if (!response.success) {
        setRows(previousRows);
        message.error(response.message || "No se pudo actualizar el paquete");
        return;
      }

      const updatedRow = response.data;
      setRows((current) => current.map((row) => (row._id === rowId ? updatedRow : row)));
    } catch (error) {
      console.error(error);
      setRows(previousRows);
      message.error("Error actualizando el paquete");
    } finally {
      setSavingRowIds((prev) => prev.filter((id) => id !== rowId));
    }
  };

  const handleDelete = (rowId: string) => {
    Modal.confirm({
      title: "Eliminar paquete",
      content: "Esta acción quitará el paquete de la lista del vendedor.",
      okText: "Eliminar",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      onOk: async () => {
        const previousRows = rows;
        setRows((current) => current.filter((row) => row._id !== rowId));
        try {
          const response = await deleteSimplePackageAPI(rowId);
          if (!response.success) {
            setRows(previousRows);
            message.error(response.message || "No se pudo eliminar el paquete");
            return;
          }
          message.success("Paquete eliminado");
        } catch (error) {
          console.error(error);
          setRows(previousRows);
          message.error("Error eliminando el paquete");
        }
      },
    });
  };

  const applyGeneralPaymentMethod = async (method: "" | "efectivo" | "qr") => {
    if (!rows.length) return;

    const previousRows = rows;
    const optimisticRows = rows.map((row) =>
      applyPackagePatch(row, {
        esta_pagado: method ? "si" : "no",
        metodo_pago: method,
      })
    );

    setRows(optimisticRows);
    setSavingGeneralPayment(true);

    try {
      const responses = await Promise.all(
        rows.map((row) =>
          updateSimplePackageAPI(String(row._id), {
            esta_pagado: method ? "si" : "no",
            metodo_pago: method,
          })
        )
      );

      const failed = responses.find((response: any) => !response?.success);
      if (failed) {
        setRows(previousRows);
        message.error(failed.message || "No se pudo actualizar el método general");
        return;
      }

      setRows(responses.map((response: any, index) => response?.data || optimisticRows[index]));
      message.success(method ? `Pago general marcado como ${method}` : "Pago general limpiado");
    } catch (error) {
      console.error(error);
      setRows(previousRows);
      message.error("Error actualizando el método general");
    } finally {
      setSavingGeneralPayment(false);
    }
  };

  const selectedSeller = sellerRows.find((seller) => String(seller._id) === String(selectedSellerId));

  return (
    <Modal
      title="Paquetes del servicio"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1320}
      style={{ maxWidth: "98vw" }}
      destroyOnClose
    >
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, minHeight: 520 }}>
        <div style={{ borderRight: "1px solid #f0f0f0", paddingRight: 12 }}>
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            Vendedores
          </Typography.Title>
          <Spin spinning={loadingSellers}>
            <Space direction="vertical" style={{ width: "100%" }}>
              {sellerRows.map((seller) => {
                const isActive = String(seller._id) === String(selectedSellerId);
                return (
                  <button
                    key={String(seller._id)}
                    type="button"
                    onClick={() => setSelectedSellerId(String(seller._id))}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: isActive ? "1px solid #91caff" : "1px solid #e5e7eb",
                      background: isActive ? "#e6f4ff" : "#ffffff",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{seller.vendedor || "Vendedor"}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{seller.total_paquetes || 0} paquetes</div>
                  </button>
                );
              })}
              {!loadingSellers && sellerRows.length === 0 && <Empty description="No hay vendedores con paquetes cargados" />}
            </Space>
          </Spin>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {selectedSeller?.vendedor || "Selecciona un vendedor"}
              </Typography.Title>
              <Typography.Text type="secondary">
                La lista siempre se muestra por vendedor. No se mezclan pedidos de todos.
              </Typography.Text>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div style={summaryCardStyle}>
              <Typography.Text type="secondary">Suma precio paquete</Typography.Text>
              <div style={{ fontSize: 22, fontWeight: 700 }}>Bs. {totals.precio_paquete.toFixed(2)}</div>
            </div>
            <div style={summaryCardStyle}>
              <Typography.Text type="secondary">Suma deuda vendedor</Typography.Text>
              <div style={{ fontSize: 22, fontWeight: 700 }}>Bs. {totals.amortizacion_vendedor.toFixed(2)}</div>
            </div>
            <div style={summaryCardStyle}>
              <Typography.Text type="secondary">Suma deuda comprador</Typography.Text>
              <div style={{ fontSize: 22, fontWeight: 700 }}>Bs. {totals.deuda_comprador.toFixed(2)}</div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div>
              <Typography.Text type="secondary">Método general</Typography.Text>
              <div style={{ fontWeight: 700, marginTop: 4 }}>
                {generalPaymentMethod === "efectivo"
                  ? "Efectivo"
                  : generalPaymentMethod === "qr"
                    ? "QR"
                    : generalPaymentMethod === "mixed"
                      ? "Mixto"
                      : "No pagado"}
              </div>
            </div>
            <Space wrap>
              <Button
                disabled={savingGeneralPayment}
                type={!generalPaymentMethod ? "primary" : "default"}
                onClick={() => applyGeneralPaymentMethod("")}
              >
                No pagado
              </Button>
              <Button
                disabled={savingGeneralPayment}
                type={generalPaymentMethod === "efectivo" ? "primary" : "default"}
                onClick={() => applyGeneralPaymentMethod("efectivo")}
              >
                Efectivo
              </Button>
              <Button
                disabled={savingGeneralPayment}
                type={generalPaymentMethod === "qr" ? "primary" : "default"}
                onClick={() => applyGeneralPaymentMethod("qr")}
              >
                QR
              </Button>
            </Space>
          </div>

          <Spin spinning={loadingRows}>
            {!selectedSellerId ? (
              <Empty description="Selecciona un vendedor para ver sus paquetes" />
            ) : rows.length === 0 ? (
              <Empty description="Este vendedor no tiene paquetes cargados" />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={tableCellStyle}>Nombre del comprador</th>
                      <th style={tableCellStyle}>Descripción del paquete</th>
                      <th style={tableCellStyle}>Celular</th>
                      <th style={tableCellStyle}>Tamaño</th>
                      <th style={tableCellStyle}>Precio paquete</th>
                      <th style={tableCellStyle}>Deuda vendedor</th>
                      <th style={tableCellStyle}>Deuda comprador</th>
                      <th style={tableCellStyle}>Borrar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const isSaving = savingRowIds.includes(String(row._id));
                      return (
                        <tr key={String(row._id)}>
                          <td style={tableCellStyle}>
                            <Input value={row.comprador || ""} readOnly style={readonlyBuyerStyle} />
                          </td>
                          <td style={tableCellStyle}>
                            <Input.TextArea
                              value={row.descripcion_paquete || ""}
                              readOnly
                              autoSize={{ minRows: 1, maxRows: 4 }}
                              style={readonlyBuyerStyle}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <Input value={row.telefono_comprador || ""} readOnly style={readonlyBuyerStyle} />
                          </td>
                          <td style={tableCellStyle}>
                            <Select
                              value={row.package_size || "estandar"}
                              style={{ width: "100%" }}
                              disabled={isSaving}
                              options={[
                                { label: "Estandar", value: "estandar" },
                                { label: "Grande", value: "grande" },
                              ]}
                              onChange={(value) => commitRowPatch(String(row._id), { package_size: value })}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <Input value={`Bs. ${Number(row.precio_paquete || 0).toFixed(2)}`} readOnly />
                          </td>
                          <td style={tableCellStyle}>
                            <Input value={`Bs. ${Number(row.amortizacion_vendedor || 0).toFixed(2)}`} readOnly />
                          </td>
                          <td style={tableCellStyle}>
                            <Input value={`Bs. ${Number(row.deuda_comprador || 0).toFixed(2)}`} readOnly />
                          </td>
                          <td style={tableCellStyle}>
                            <Button danger block disabled={isSaving} onClick={() => handleDelete(String(row._id))}>
                              Borrar
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Spin>
        </div>
      </div>
    </Modal>
  );
};

export default SimplePackageManagerModal;
