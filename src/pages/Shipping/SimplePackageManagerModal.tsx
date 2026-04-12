import { Button, Empty, Input, Modal, Select, Space, Spin, Typography, message } from "antd";
import { useContext, useEffect, useMemo, useState } from "react";
import {
  deleteSimplePackageAPI,
  getSimplePackageBranchPricesAPI,
  getSimplePackagesListAPI,
  getUploadedSimplePackageSellersAPI,
  updateSimplePackageAPI,
} from "../../api/simplePackage";
import { getSellerAPI } from "../../api/seller";
import { UserContext } from "../../context/userContext";
import { isSuperadminUser } from "../../utils/role";
import { applyPackagePatch, calculateSimplePackageTotals } from "../SimplePackages/simplePackageHelpers";
import SimplePackageBranchPriceModal from "./SimplePackageBranchPriceModal";
import SimplePackageCreateModal from "./SimplePackageCreateModal";

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
  const { user }: any = useContext(UserContext);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [sellerRows, setSellerRows] = useState<any[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [savingRowIds, setSavingRowIds] = useState<string[]>([]);
  const [savingGeneralPayment, setSavingGeneralPayment] = useState(false);
  const [sellerConfig, setSellerConfig] = useState({
    precio_paquete: 0,
    amortizacion: 0,
    saldo_por_paquete: 0,
  });
  const [branchPrices, setBranchPrices] = useState<any[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [branchPriceModalVisible, setBranchPriceModalVisible] = useState(false);

  const totals = useMemo(() => calculateSimplePackageTotals(rows), [rows]);
  const generalPaymentMethod = useMemo(() => {
    if (!rows.length) return "";
    const paidRows = rows.filter((row) => row.esta_pagado === "si");
    if (!paidRows.length) return "";
    const firstMethod = String(paidRows[0]?.metodo_pago || "");
    if (!firstMethod) return "";
    return paidRows.every((row) => String(row.metodo_pago || "") === firstMethod) ? firstMethod : "mixed";
  }, [rows]);

  const originSummary = useMemo(() => {
    const names = Array.from(
      new Set(
        rows
          .map((row) =>
            String(row?.origen_sucursal?.nombre || row?.sucursal?.nombre || row?.lugar_origen?.nombre || "").trim()
          )
          .filter(Boolean)
      )
    );
    if (!names.length) return "Sin origen";
    if (names.length === 1) return names[0];
    return "Origen mixto";
  }, [rows]);

  const routeOptionsByOrigin = useMemo(() => {
    const map = new Map<string, { value: string; label: string; precio: number }[]>();
    branchPrices.forEach((row: any) => {
      const originId = String(row?.origen_sucursal?._id || row?.origen_sucursal || "");
      const destinationId = String(row?.destino_sucursal?._id || row?.destino_sucursal || "");
      if (!originId || !destinationId) return;
      const current = map.get(originId) || [];
      current.push({
        value: destinationId,
        label: String(row?.destino_sucursal?.nombre || "Sucursal"),
        precio: Number(row?.precio || 0),
      });
      map.set(originId, current);
    });
    return map;
  }, [branchPrices]);

  const getRoutePrice = (originId: string, destinationId?: string) =>
    Number(
      (routeOptionsByOrigin.get(String(originId)) || []).find(
        (item) => String(item.value) === String(destinationId || "")
      )?.precio || 0
    );

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
      const [response, sellerResponse, pricesResponse] = await Promise.all([
        getSimplePackagesListAPI({ sellerId }),
        getSellerAPI(sellerId),
        getSimplePackageBranchPricesAPI(),
      ]);
      setRows(Array.isArray(response?.rows) ? response.rows : []);
      setSellerConfig({
        precio_paquete: Number(sellerResponse?.precio_paquete || 0),
        amortizacion: Number(sellerResponse?.amortizacion || 0),
        saldo_por_paquete: Number(sellerResponse?.saldo_por_paquete || 0),
      });
      setBranchPrices(Array.isArray(pricesResponse?.rows) ? pricesResponse.rows : []);
    } catch (error) {
      console.error(error);
      message.error("No se pudieron cargar los paquetes");
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    void fetchSellers();
  }, [visible]);

  useEffect(() => {
    if (!visible || !selectedSellerId) return;
    void fetchPackages(selectedSellerId);
  }, [visible, selectedSellerId]);

  const commitRowPatch = async (rowId: string, patch: Record<string, unknown>) => {
    const previousRows = rows;
    const optimisticRows = rows.map((row) => {
      if (String(row._id) !== String(rowId)) return row;
      const originId = String(row?.origen_sucursal?._id || row?.origen_sucursal || row?.sucursal?._id || row?.sucursal || "");
      const destinationId = String(
        patch.destino_sucursal ?? (row?.destino_sucursal?._id || row?.destino_sucursal || "")
      );
      return applyPackagePatch(
        row,
        {
          ...patch,
          precio_entre_sucursal: getRoutePrice(originId, destinationId),
        },
        sellerConfig
      );
    });
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
      setRows((current) => current.map((row) => (String(row._id) === String(rowId) ? updatedRow : row)));
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
      content: "Esta accion quitara el paquete de la lista del vendedor.",
      okText: "Eliminar",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      onOk: async () => {
        const previousRows = rows;
        setRows((current) => current.filter((row) => String(row._id) !== String(rowId)));
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
      applyPackagePatch(
        row,
        {
          esta_pagado: method ? "si" : "no",
          metodo_pago: method,
        },
        sellerConfig
      )
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
        message.error(failed.message || "No se pudo actualizar el metodo general");
        return;
      }

      setRows(responses.map((response: any, index) => response?.data || optimisticRows[index]));
      message.success(method ? `Pago general marcado como ${method}` : "Pago general limpiado");
    } catch (error) {
      console.error(error);
      setRows(previousRows);
      message.error("Error actualizando el metodo general");
    } finally {
      setSavingGeneralPayment(false);
    }
  };

  const selectedSeller = sellerRows.find((seller) => String(seller._id) === String(selectedSellerId));

  return (
    <>
      <Modal
        title="Paquetes del servicio"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={1480}
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {selectedSeller?.vendedor || "Selecciona un vendedor"}
                </Typography.Title>
                <Typography.Text type="secondary">
                  La lista siempre se muestra por vendedor. No se mezclan pedidos de todos.
                </Typography.Text>
                <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                  Origen registrado: <strong>{originSummary}</strong>
                </div>
              </div>
              <Space wrap>
                <Button type="primary" onClick={() => setCreateModalVisible(true)}>
                  Crear paquetes
                </Button>
                {isSuperadminUser(user) && (
                  <Button onClick={() => setBranchPriceModalVisible(true)}>Editar precios entre sucursales</Button>
                )}
              </Space>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
              <div style={summaryCardStyle}>
                <Typography.Text type="secondary">Suma precio paquete</Typography.Text>
                <div style={{ fontSize: 22, fontWeight: 700 }}>Bs. {totals.precio_paquete.toFixed(2)}</div>
              </div>
              <div style={summaryCardStyle}>
                <Typography.Text type="secondary">Suma entre sucursales</Typography.Text>
                <div style={{ fontSize: 22, fontWeight: 700 }}>Bs. {totals.precio_entre_sucursal.toFixed(2)}</div>
              </div>
              <div style={summaryCardStyle}>
                <Typography.Text type="secondary">Suma saldo por paquete</Typography.Text>
                <div style={{ fontSize: 22, fontWeight: 700 }}>Bs. {totals.saldo_por_paquete.toFixed(2)}</div>
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
                <Typography.Text type="secondary">Metodo general</Typography.Text>
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
                        <th style={tableCellStyle}>Descripcion del paquete</th>
                        <th style={tableCellStyle}>Celular</th>
                        <th style={tableCellStyle}>Sucursal destino</th>
                        <th style={tableCellStyle}>Tamaño</th>
                        <th style={tableCellStyle}>Precio entre sucursal</th>
                        <th style={tableCellStyle}>Precio paquete</th>
                        <th style={tableCellStyle}>Saldo por paquete</th>
                        <th style={tableCellStyle}>Deuda vendedor</th>
                        <th style={tableCellStyle}>Deuda comprador</th>
                        <th style={tableCellStyle}>Borrar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const isSaving = savingRowIds.includes(String(row._id));
                        const originId = String(
                          row?.origen_sucursal?._id || row?.origen_sucursal || row?.sucursal?._id || row?.sucursal || ""
                        );
                        const destinationOptions = routeOptionsByOrigin.get(originId) || [];

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
                                value={String(row?.destino_sucursal?._id || row?.destino_sucursal || "") || undefined}
                                style={{ width: "100%" }}
                                disabled={isSaving}
                                options={destinationOptions}
                                onChange={(value) =>
                                  commitRowPatch(String(row._id), {
                                    destino_sucursal: value,
                                  })
                                }
                              />
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
                              <Input value={`Bs. ${Number(row.precio_entre_sucursal || 0).toFixed(2)}`} readOnly />
                            </td>
                            <td style={tableCellStyle}>
                              <Input value={`Bs. ${Number(row.precio_paquete || 0).toFixed(2)}`} readOnly />
                            </td>
                            <td style={tableCellStyle}>
                              <Input value={`Bs. ${Number(row.saldo_por_paquete || 0).toFixed(2)}`} readOnly />
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

      <SimplePackageCreateModal
        visible={createModalVisible}
        initialSellerId={selectedSellerId || undefined}
        onClose={() => setCreateModalVisible(false)}
        onCreated={() => {
          setCreateModalVisible(false);
          void fetchSellers();
          if (selectedSellerId) {
            void fetchPackages(selectedSellerId);
          }
        }}
      />

      <SimplePackageBranchPriceModal
        visible={branchPriceModalVisible}
        onClose={() => {
          setBranchPriceModalVisible(false);
          if (selectedSellerId) {
            void fetchPackages(selectedSellerId);
          }
        }}
      />
    </>
  );
};

export default SimplePackageManagerModal;
