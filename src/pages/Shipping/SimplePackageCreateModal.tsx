import { Button, Card, Input, InputNumber, Modal, Select, Space, Spin, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { getSellersBasicAPI, getSellerAPI } from "../../api/seller";
import { getSimplePackageBranchPricesAPI, registerSimplePackagesAPI } from "../../api/simplePackage";
import { branchesEnableSimplePackageService } from "../../utils/sellerServiceAccess";
import { createDraftRow, resizeDraftRows, SimplePackageDraftRow } from "../SimplePackages/simplePackageHelpers";

interface SimplePackageCreateModalProps {
  visible: boolean;
  initialSellerId?: string;
  onClose: () => void;
  onCreated: () => void;
}

const MIN_PACKAGES = 1;

const tableCellStyle: React.CSSProperties = {
  border: "1px solid #d9d9d9",
  padding: 6,
  verticalAlign: "top",
};

type SellerConfig = {
  precio_paquete: number;
  amortizacion: number;
  saldo_por_paquete: number;
};

const SimplePackageCreateModal = ({ visible, initialSellerId, onClose, onCreated }: SimplePackageCreateModalProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [sellerOptions, setSellerOptions] = useState<any[]>([]);
  const [sellerBranches, setSellerBranches] = useState<any[]>([]);
  const [branchPrices, setBranchPrices] = useState<any[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [selectedOriginId, setSelectedOriginId] = useState("");
  const [selectedDestinationId, setSelectedDestinationId] = useState("");
  const [packageCount, setPackageCount] = useState(MIN_PACKAGES);
  const [generalDescription, setGeneralDescription] = useState("");
  const [sellerConfig, setSellerConfig] = useState<SellerConfig>({
    precio_paquete: 0,
    amortizacion: 0,
      saldo_por_paquete: 0,
  });
  const [rows, setRows] = useState<SimplePackageDraftRow[]>([
    createDraftRow(0, { precio_paquete: 0, amortizacion: 0, saldo_por_paquete: 0 }),
  ]);

  const routePriceMap = useMemo(() => {
    const map = new Map<string, number>();
    branchPrices.forEach((row: any) => {
      const originId = String(row?.origen_sucursal?._id || row?.origen_sucursal || "");
      const destinationId = String(row?.destino_sucursal?._id || row?.destino_sucursal || "");
      if (!originId || !destinationId) return;
      map.set(`${originId}::${destinationId}`, Number(row?.precio || 0));
    });
    return map;
  }, [branchPrices]);

  const originOptions = useMemo(
    () =>
      sellerBranches.map((branch) => ({
        value: String(branch?.id_sucursal?._id || branch?.id_sucursal || ""),
        label: String(branch?.sucursalName || branch?.id_sucursal?.nombre || "Sucursal"),
      })),
    [sellerBranches]
  );

  const destinationOptions = useMemo(() => {
    if (!selectedOriginId) return [];
    const sameOriginOption = originOptions.find((option) => String(option.value) === String(selectedOriginId));
    const pricedOptions = branchPrices
      .filter((row: any) => String(row?.origen_sucursal?._id || row?.origen_sucursal || "") === String(selectedOriginId))
      .map((row: any) => ({
        value: String(row?.destino_sucursal?._id || row?.destino_sucursal || ""),
        label: String(row?.destino_sucursal?.nombre || "Sucursal destino"),
      }));
    return [
      ...(sameOriginOption ? [{ value: sameOriginOption.value, label: sameOriginOption.label }] : []),
      ...pricedOptions.filter((option) => String(option.value) !== String(selectedOriginId)),
    ];
  }, [branchPrices, originOptions, selectedOriginId]);

  const getBranchRoutePrice = (originId: string, destinationId?: string) =>
    String(originId) === String(destinationId || "")
      ? 0
      : Number(routePriceMap.get(`${originId}::${destinationId || ""}`) || 0);

  const resetState = () => {
    setSelectedSellerId(initialSellerId || "");
    setSelectedOriginId("");
    setSelectedDestinationId("");
    setPackageCount(MIN_PACKAGES);
    setGeneralDescription("");
    setSellerBranches([]);
    setSellerConfig({ precio_paquete: 0, amortizacion: 0, saldo_por_paquete: 0 });
    setRows([createDraftRow(0, { precio_paquete: 0, amortizacion: 0, saldo_por_paquete: 0 })]);
  };

  useEffect(() => {
    if (!visible) return;

    const loadBaseData = async () => {
      setLoadingData(true);
      try {
        const [sellersResponse, pricesResponse] = await Promise.all([
          getSellersBasicAPI({ onlyActiveOrRenewal: true }),
          getSimplePackageBranchPricesAPI(),
        ]);
        const sellers = (Array.isArray(sellersResponse) ? sellersResponse : []).filter((seller: any) =>
          branchesEnableSimplePackageService(seller?.pago_sucursales || [])
        );

        setSellerOptions(
          sellers.map((seller: any) => ({
            value: String(seller?._id || ""),
            label:
              `${String(seller?.nombre || "").trim()} ${String(seller?.apellido || "").trim()}`.trim() ||
              String(seller?.mail || "Vendedor"),
          }))
        );
        setBranchPrices(Array.isArray(pricesResponse?.rows) ? pricesResponse.rows : []);
        setSelectedSellerId(String(initialSellerId || sellers[0]?._id || ""));
      } catch (error) {
        console.error(error);
        message.error("No se pudieron cargar los vendedores del servicio");
      } finally {
        setLoadingData(false);
      }
    };

    void loadBaseData();
  }, [visible, initialSellerId]);

  useEffect(() => {
    if (!visible || !selectedSellerId) return;

    const loadSeller = async () => {
      setLoadingData(true);
      try {
        const seller = await getSellerAPI(selectedSellerId);
        const nextConfig = {
          precio_paquete: Number(seller?.precio_paquete || 0),
          amortizacion: Number(seller?.amortizacion || 0),
          saldo_por_paquete: 0,
        };
        const nextBranches = Array.isArray(seller?.pago_sucursales)
          ? seller.pago_sucursales.filter((branch: any) => Number(branch?.entrega_simple || 0) > 0)
          : [];
        const defaultOrigin = String(nextBranches[0]?.id_sucursal?._id || nextBranches[0]?.id_sucursal || "");

        setSellerConfig(nextConfig);
        setSellerBranches(nextBranches);
        setSelectedOriginId(defaultOrigin);
        setSelectedDestinationId("");
        setPackageCount(MIN_PACKAGES);
        setGeneralDescription("");
        setRows(resizeDraftRows(MIN_PACKAGES, [], nextConfig));
      } catch (error) {
        console.error(error);
        message.error("No se pudo cargar la configuracion del vendedor");
      } finally {
        setLoadingData(false);
      }
    };

    void loadSeller();
  }, [selectedSellerId, visible]);

  useEffect(() => {
    if (!selectedOriginId) return;

    setSelectedDestinationId((current) =>
      destinationOptions.some((option) => String(option.value) === String(current)) ? current : ""
    );
    setRows((prev) =>
      prev.map((row, index) => {
        const nextDestinationId =
          row.destino_sucursal_id &&
          destinationOptions.some((option) => String(option.value) === String(row.destino_sucursal_id))
            ? row.destino_sucursal_id
            : "";

        return createDraftRow(index, sellerConfig, {
          ...row,
          destino_sucursal_id: nextDestinationId,
          precio_entre_sucursal: getBranchRoutePrice(selectedOriginId, nextDestinationId),
        });
      })
    );
  }, [destinationOptions, selectedOriginId, sellerConfig, routePriceMap]);

  const updateRow = (index: number, patch: Partial<SimplePackageDraftRow>) => {
    setRows((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const nextDestinationId = String(patch.destino_sucursal_id ?? (row.destino_sucursal_id || ""));
        return createDraftRow(index, sellerConfig, {
          ...row,
          ...patch,
          destino_sucursal_id: nextDestinationId,
          precio_entre_sucursal: getBranchRoutePrice(selectedOriginId, nextDestinationId),
        });
      })
    );
  };

  const handleSave = async () => {
    if (!selectedSellerId) {
      message.error("Selecciona un vendedor");
      return;
    }
    if (!selectedOriginId) {
      message.error("Selecciona una sucursal de origen");
      return;
    }

    const paquetes = rows.map((row) => ({
      comprador: String(row.comprador || "").trim(),
      telefono_comprador: String(row.telefono_comprador || "").trim(),
      descripcion_paquete: String(row.descripcion_paquete || "").trim(),
      destino_sucursal_id: String(row.destino_sucursal_id || "").trim(),
      package_size: "estandar",
      saldo_por_paquete: Number(row.saldo_por_paquete || 0),
    }));

    for (let index = 0; index < paquetes.length; index += 1) {
      const row = paquetes[index];
      if (!row.comprador && !row.telefono_comprador) {
        message.error(`Paquete ${index + 1}: ingresa nombre o celular del comprador`);
        return;
      }
      if (!row.descripcion_paquete) {
        message.error(`Paquete ${index + 1}: la descripcion es obligatoria`);
        return;
      }
      if (!row.destino_sucursal_id) {
        message.error(`Paquete ${index + 1}: selecciona una sucursal destino`);
        return;
      }
    }

    setLoading(true);
    try {
      const response = await registerSimplePackagesAPI({
        sellerId: selectedSellerId,
        originBranchId: selectedOriginId,
        paquetes,
      });

      if (!response.success) {
        message.error(response.message || "No se pudieron registrar los paquetes");
        return;
      }

      message.success(`Se registraron ${response.createdCount || paquetes.length} paquetes`);
      resetState();
      onCreated();
    } catch (error) {
      console.error(error);
      message.error("Error registrando paquetes del servicio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Crear paquetes del servicio"
      open={visible}
      onCancel={() => {
        resetState();
        onClose();
      }}
      footer={null}
      width={1180}
      destroyOnClose
    >
      <Spin spinning={loadingData}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_220px_220px_1fr_auto] gap-3 items-end">
              <div>
                <Typography.Text strong>Vendedor</Typography.Text>
                <Select
                  style={{ width: "100%", marginTop: 8 }}
                  value={selectedSellerId || undefined}
                  onChange={(value) => setSelectedSellerId(String(value || ""))}
                  options={sellerOptions}
                  placeholder="Selecciona un vendedor"
                  showSearch
                  optionFilterProp="label"
                />
              </div>
              <div>
                <Typography.Text strong>Numero de paquetes</Typography.Text>
                <InputNumber
                  min={MIN_PACKAGES}
                  style={{ width: "100%", marginTop: 8 }}
                  value={packageCount}
                  onChange={(value) => {
                    const nextCount = Math.max(MIN_PACKAGES, Number(value || MIN_PACKAGES));
                    setPackageCount(nextCount);
                    setRows((prev) => resizeDraftRows(nextCount, prev, sellerConfig));
                  }}
                />
              </div>
              <div>
                <Typography.Text strong>Sucursal origen (Donde dejarás el paquete)</Typography.Text>
                <Select
                  style={{ width: "100%", marginTop: 8 }}
                  value={selectedOriginId || undefined}
                  onChange={(value) => setSelectedOriginId(String(value || ""))}
                  options={originOptions}
                  placeholder="Origen"
                />
              </div>
              <div>
                <Typography.Text strong>Sucursal destino (Donde recogerá tu cliente)</Typography.Text>
                <Select
                  style={{ width: "100%", marginTop: 8 }}
                  value={selectedDestinationId || undefined}
                  onChange={(value) => setSelectedDestinationId(String(value || ""))}
                  options={destinationOptions}
                  placeholder="Destino"
                  allowClear
                  disabled={!selectedOriginId}
                />
              </div>
              <Button
                disabled={!selectedOriginId || !selectedDestinationId}
                onClick={() =>
                  setRows((prev) =>
                    prev.map((row, index) =>
                      createDraftRow(index, sellerConfig, {
                        ...row,
                        destino_sucursal_id: selectedDestinationId,
                        precio_entre_sucursal: getBranchRoutePrice(selectedOriginId, selectedDestinationId),
                      })
                    )
                  )
                }
              >
                Usar destino en todos
              </Button>
            </div>
          </Card>

          <Card>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <Typography.Text strong>Descripcion general</Typography.Text>
                <Input
                  style={{ marginTop: 8 }}
                  value={generalDescription}
                  onChange={(event) => setGeneralDescription(event.target.value)}
                  placeholder="Ej: Lote abril, cajas pequeñas, ropa nueva"
                />
              </div>
              <Button
                onClick={() =>
                  setRows((prev) =>
                    prev.map((row, index) =>
                      createDraftRow(index, sellerConfig, {
                        ...row,
                        descripcion_paquete: String(generalDescription || "").trim(),
                      })
                    )
                  )
                }
              >
                Usar en todos
              </Button>
            </div>
          </Card>

          <Card bodyStyle={{ padding: 0 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={tableCellStyle}>Nombre del comprador</th>
                    <th style={tableCellStyle}>Descripcion del paquete</th>
                    <th style={tableCellStyle}>Celular</th>
                    <th style={tableCellStyle}>Sucursal destino</th>
                    <th style={tableCellStyle}>Saldo por paquete</th>
                    <th style={tableCellStyle}>Precio entre sucursal</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.key}>
                      <td style={tableCellStyle}>
                        <Input
                          value={row.comprador}
                          onChange={(event) => updateRow(index, { comprador: event.target.value })}
                        />
                      </td>
                      <td style={tableCellStyle}>
                        <Input.TextArea
                          value={row.descripcion_paquete}
                          autoSize={{ minRows: 1, maxRows: 5 }}
                          onChange={(event) => updateRow(index, { descripcion_paquete: event.target.value })}
                        />
                      </td>
                      <td style={tableCellStyle}>
                        <Input
                          value={row.telefono_comprador}
                          onChange={(event) =>
                            updateRow(index, {
                              telefono_comprador: event.target.value.replace(/[^\d]/g, ""),
                            })
                          }
                        />
                      </td>
                      <td style={tableCellStyle}>
                        <Select
                          style={{ width: "100%" }}
                          value={row.destino_sucursal_id || undefined}
                          options={destinationOptions}
                          placeholder="Destino"
                          disabled={!selectedOriginId}
                          onChange={(value) => updateRow(index, { destino_sucursal_id: String(value || "") })}
                        />
                      </td>
                      <td style={tableCellStyle}>
                        <InputNumber
                          min={0}
                          style={{ width: "100%" }}
                          addonBefore="Bs."
                          value={Number(row.saldo_por_paquete || 0)}
                          onChange={(value) =>
                            updateRow(index, { saldo_por_paquete: Math.max(0, Number(value || 0)) })
                          }
                        />
                      </td>
                      <td style={tableCellStyle}>
                        <Input value={`Bs. ${Number(row.precio_entre_sucursal || 0).toFixed(2)}`} readOnly />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button
              onClick={() => {
                setPackageCount(MIN_PACKAGES);
                setGeneralDescription("");
                setSelectedDestinationId("");
                setRows(resizeDraftRows(MIN_PACKAGES, [], sellerConfig));
              }}
            >
              Limpiar
            </Button>
            <Button type="primary" loading={loading} onClick={handleSave}>
              Guardar paquetes
            </Button>
          </div>
        </Space>
      </Spin>
    </Modal>
  );
};

export default SimplePackageCreateModal;
