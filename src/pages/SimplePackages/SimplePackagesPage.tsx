import { Button, Card, Input, InputNumber, Space, Spin, Typography, message } from "antd";
import { useContext, useEffect, useState } from "react";
import { getSellerAPI } from "../../api/seller";
import { registerSimplePackagesAPI } from "../../api/simplePackage";
import { UserContext } from "../../context/userContext";
import {
  createDraftRow,
  resizeDraftRows,
  SimplePackageDraftRow,
} from "./simplePackageHelpers";

const MIN_PACKAGES = 1;

const tableCellStyle: React.CSSProperties = {
  border: "1px solid #d9d9d9",
  padding: 6,
  verticalAlign: "top",
};

const SimplePackagesPage = () => {
  const { user }: any = useContext(UserContext);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [packageCount, setPackageCount] = useState(MIN_PACKAGES);
  const [generalDescription, setGeneralDescription] = useState("");
  const [sellerConfig, setSellerConfig] = useState({
    precio_paquete: Number(user?.seller_precio_paquete || 0),
    amortizacion: Number(user?.seller_amortizacion || 0),
  });
  const [rows, setRows] = useState<SimplePackageDraftRow[]>([
    createDraftRow(0, {
      precio_paquete: Number(user?.seller_precio_paquete || 0),
      amortizacion: Number(user?.seller_amortizacion || 0),
    }),
  ]);

  useEffect(() => {
    const fetchSellerConfig = async () => {
      if (!user?.id_vendedor) {
        setLoadingConfig(false);
        return;
      }

      try {
        const seller = await getSellerAPI(user.id_vendedor);
        const nextConfig = {
          precio_paquete: Number(seller?.precio_paquete ?? user?.seller_precio_paquete ?? 0),
          amortizacion: Number(seller?.amortizacion ?? user?.seller_amortizacion ?? 0),
        };
        setSellerConfig(nextConfig);
        setRows(resizeDraftRows(MIN_PACKAGES, [], nextConfig));
      } catch (error) {
        console.error(error);
        message.error("No se pudo cargar la configuración del servicio");
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchSellerConfig();
  }, [user?.id_vendedor, user?.seller_amortizacion, user?.seller_precio_paquete]);

  const updateRow = (index: number, patch: Partial<SimplePackageDraftRow>) => {
    setRows((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        return createDraftRow(index, sellerConfig, {
          ...row,
          ...patch,
        });
      })
    );
  };

  const handlePackageCountChange = (value: number | null) => {
    const nextCount = Math.max(MIN_PACKAGES, Number(value || MIN_PACKAGES));
    setPackageCount(nextCount);
    setRows((prev) => resizeDraftRows(nextCount, prev, sellerConfig));
  };

  const handleApplyDescription = () => {
    const description = String(generalDescription || "").trim();
    if (!description) {
      message.warning("Escribe una descripción general antes de aplicarla");
      return;
    }

    setRows((prev) =>
      prev.map((row, index) =>
        createDraftRow(index, sellerConfig, {
          ...row,
          descripcion_paquete: description,
        })
      )
    );
    message.success("Descripción aplicada a todos los paquetes");
  };

  const handleSubmit = async () => {
    const payloadRows = rows.map((row) => ({
      comprador: String(row.comprador || "").trim(),
      telefono_comprador: String(row.telefono_comprador || "").trim(),
      descripcion_paquete: String(row.descripcion_paquete || "").trim(),
      package_size: row.package_size,
    }));

    for (let index = 0; index < payloadRows.length; index += 1) {
      const row = payloadRows[index];
      if (!row.comprador && !row.telefono_comprador) {
        message.error(`Paquete ${index + 1}: ingresa nombre o celular del comprador`);
        return;
      }
      if (!row.descripcion_paquete) {
        message.error(`Paquete ${index + 1}: la descripción es obligatoria`);
        return;
      }
    }

    setSaving(true);
    try {
      const response = await registerSimplePackagesAPI({
        sellerId: user?.id_vendedor,
        sucursalId: localStorage.getItem("sucursalId") || undefined,
        paquetes: payloadRows,
      });

      if (!response.success) {
        message.error(response.message || "No se pudieron registrar los paquetes");
        return;
      }

      message.success(`Se registraron ${response.createdCount || payloadRows.length} paquetes`);
      setPackageCount(MIN_PACKAGES);
      setGeneralDescription("");
      setRows(resizeDraftRows(MIN_PACKAGES, [], sellerConfig));
    } catch (error) {
      console.error(error);
      message.error("Error registrando paquetes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
          <img src="/box-icon.png" alt="Paquetes" className="w-8 h-8" />
          <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">Paquetes del servicio</h1>
        </div>
      </div>

      <Spin spinning={loadingConfig}>
        <Space direction="vertical" size={16} style={{ display: "flex" }}>
          <Card>
            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_auto] gap-3 items-end">
              <div>
                <Typography.Text strong>Número de paquetes</Typography.Text>
                <InputNumber
                  min={MIN_PACKAGES}
                  style={{ width: "100%", marginTop: 8 }}
                  value={packageCount}
                  onChange={handlePackageCountChange}
                />
              </div>
              <div>
                <Typography.Text strong>Descripción general</Typography.Text>
                <Input
                  style={{ marginTop: 8 }}
                  value={generalDescription}
                  onChange={(event) => setGeneralDescription(event.target.value)}
                  placeholder="Ej: Ropa otoño, lote abril, accesorios pequeños"
                />
              </div>
              <Button onClick={handleApplyDescription}>Usar en todos</Button>
            </div>
          </Card>

          <Card bodyStyle={{ padding: 0 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={tableCellStyle}>Nombre del comprador</th>
                    <th style={tableCellStyle}>Descripción del paquete</th>
                    <th style={tableCellStyle}>Celular</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.key}>
                      <td style={tableCellStyle}>
                        <Input
                          value={row.comprador}
                          placeholder="Nombre del comprador"
                          onChange={(event) => updateRow(index, { comprador: event.target.value })}
                        />
                      </td>
                      <td style={tableCellStyle}>
                        <Input.TextArea
                          value={row.descripcion_paquete}
                          placeholder="Descripción"
                          autoSize={{ minRows: 1, maxRows: 5 }}
                          onChange={(event) =>
                            updateRow(index, { descripcion_paquete: event.target.value })
                          }
                        />
                      </td>
                      <td style={tableCellStyle}>
                        <Input
                          value={row.telefono_comprador}
                          placeholder="Celular"
                          onChange={(event) =>
                            updateRow(index, {
                              telefono_comprador: event.target.value.replace(/[^\d]/g, ""),
                            })
                          }
                        />
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
                setRows(resizeDraftRows(MIN_PACKAGES, [], sellerConfig));
              }}
            >
              Limpiar
            </Button>
            <Button type="primary" loading={saving} onClick={handleSubmit}>
              Guardar paquetes
            </Button>
          </div>
        </Space>
      </Spin>
    </div>
  );
};

export default SimplePackagesPage;
