import { Button, Card, Input, InputNumber, Modal, Select, Space, Spin, Table, Typography, message } from "antd";
import { useContext, useEffect, useMemo, useState } from "react";
import { getSellerAPI } from "../../api/seller";
import {
  getSimplePackageBranchPricesAPI,
  getSimplePackageEscalationStatusAPI,
  getSimplePackagesListAPI,
  registerSimplePackagesAPI,
  updateSimplePackageAPI,
  deleteSimplePackageAPI,
} from "../../api/simplePackage";
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

type SellerConfig = {
  precio_paquete: number;
  amortizacion: number;
  saldo_por_paquete: number;
};

const SimplePackagesPage = () => {
  const { user }: any = useContext(UserContext);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [packageCount, setPackageCount] = useState(MIN_PACKAGES);
  const [generalDescription, setGeneralDescription] = useState("");
  const [selectedOriginId, setSelectedOriginId] = useState("");
  const [selectedDestinationId, setSelectedDestinationId] = useState("");
  const [sellerBranches, setSellerBranches] = useState<any[]>([]);
  const [branchPrices, setBranchPrices] = useState<any[]>([]);
  const [monthlyPackageCount, setMonthlyPackageCount] = useState(0);
  const [missingForNextRange, setMissingForNextRange] = useState(0);
  const [pendingModalVisible, setPendingModalVisible] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingSavingId, setPendingSavingId] = useState("");
  const [pendingRows, setPendingRows] = useState<any[]>([]);
  const [sellerConfig, setSellerConfig] = useState<SellerConfig>({
    precio_paquete: Number(user?.seller_precio_paquete || 0),
    amortizacion: Number(user?.seller_amortizacion || 0),
    saldo_por_paquete: 0,
  });
  const [rows, setRows] = useState<SimplePackageDraftRow[]>([
    createDraftRow(0, {
      precio_paquete: Number(user?.seller_precio_paquete || 0),
      amortizacion: Number(user?.seller_amortizacion || 0),
      saldo_por_paquete: 0,
    }),
  ]);

  const routePriceMap = useMemo(() => {
    const map = new Map<string, { precio: number; destino: any }>();
    branchPrices.forEach((row: any) => {
      const originId = String(row?.origen_sucursal?._id || row?.origen_sucursal || "");
      const destinationId = String(row?.destino_sucursal?._id || row?.destino_sucursal || "");
      if (!originId || !destinationId) return;
      map.set(`${originId}::${destinationId}`, {
        precio: Number(row?.precio || 0),
        destino: row?.destino_sucursal,
      });
    });
    return map;
  }, [branchPrices]);

  const routeIdMap = useMemo(() => {
    const map = new Map<string, string>();
    branchPrices.forEach((row: any) => {
      const originId = String(row?.origen_sucursal?._id || row?.origen_sucursal || "");
      const destinationId = String(row?.destino_sucursal?._id || row?.destino_sucursal || "");
      if (!originId || !destinationId) return;
      map.set(`${originId}::${destinationId}`, String(row?._id || ""));
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
    const allowedBranchIds = new Set(
      sellerBranches
        .map((branch: any) => String(branch?.id_sucursal?._id || branch?.id_sucursal || ""))
        .filter(Boolean)
    );
    const sameOriginOption = originOptions.find((option) => String(option.value) === String(selectedOriginId));
    const pricedOptions = branchPrices
      .filter((row: any) => String(row?.origen_sucursal?._id || row?.origen_sucursal || "") === String(selectedOriginId))
      .map((row: any) => ({
        value: String(row?.destino_sucursal?._id || row?.destino_sucursal || ""),
        label: String(row?.destino_sucursal?.nombre || "Sucursal destino"),
      }))
      .filter((option) => allowedBranchIds.has(String(option.value)));
    return [
      ...(sameOriginOption ? [{ value: sameOriginOption.value, label: sameOriginOption.label }] : []),
      ...pricedOptions.filter((option) => String(option.value) !== String(selectedOriginId)),
    ];
  }, [branchPrices, originOptions, selectedOriginId, sellerBranches]);

  const getBranchRoutePrice = (originId: string, destinationId?: string) => {
    if (!originId || !destinationId) return 0;
    if (String(originId) === String(destinationId)) return 0;
    return Number(routePriceMap.get(`${originId}::${destinationId}`)?.precio || 0);
  };

  const getRouteId = (originId: string, destinationId?: string) => {
    if (!originId || !destinationId) return "";
    return String(routeIdMap.get(`${originId}::${destinationId}`) || "");
  };

  const getBranchId = (value: any) => String(value?._id || value?.id_sucursal || value || "");
  const simpleBranchOptions = useMemo(
    () =>
      sellerBranches
        .map((branch: any) => ({
          value: getBranchId(branch?.id_sucursal),
          label: String(branch?.sucursalName || branch?.id_sucursal?.nombre || "Sucursal"),
        }))
        .filter((option) => option.value),
    [sellerBranches]
  );

  const fetchPendingPackages = async () => {
    if (!user?.id_vendedor) return;
    setPendingLoading(true);
    try {
      const response = await getSimplePackagesListAPI({ sellerId: user.id_vendedor });
      if (response?.success === false) {
        message.error(response.message || "No se pudieron cargar los paquetes pendientes");
        return;
      }
      setPendingRows(Array.isArray(response?.rows) ? response.rows : []);
    } catch (error) {
      console.error(error);
      message.error("No se pudieron cargar los paquetes pendientes");
    } finally {
      setPendingLoading(false);
    }
  };

  const patchPendingRow = (id: string, patch: Record<string, any>) => {
    setPendingRows((current) =>
      current.map((row) => (String(row?._id) === String(id) ? { ...row, ...patch } : row))
    );
  };

  const savePendingRow = async (row: any) => {
    const rowId = String(row?._id || "");
    if (!rowId) return;

    setPendingSavingId(rowId);
    try {
      const response = await updateSimplePackageAPI(rowId, {
        comprador: String(row.comprador || "").trim(),
        telefono_comprador: String(row.telefono_comprador || "").trim(),
        descripcion_paquete: String(row.descripcion_paquete || "").trim(),
        origen_sucursal_id: getBranchId(row.origen_sucursal || row.sucursal),
        destino_sucursal_id: getBranchId(row.destino_sucursal),
        amortizacion_vendedor: Number(row.amortizacion_vendedor || 0),
        saldo_por_paquete: Number(row.saldo_por_paquete || 0),
      });

      if (!response.success) {
        message.error(response.message || "No se pudo guardar el paquete");
        return;
      }

      message.success("Paquete actualizado");
      await fetchPendingPackages();
    } catch (error) {
      console.error(error);
      message.error("No se pudo guardar el paquete");
    } finally {
      setPendingSavingId("");
    }
  };

  const deletePendingRow = (row: any) => {
    Modal.confirm({
      title: "Eliminar paquete pendiente",
      content: "Solo se puede eliminar si todavia no fue convertido en pedido.",
      okText: "Eliminar",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      onOk: async () => {
        const response = await deleteSimplePackageAPI(String(row?._id || ""));
        if (!response.success) {
          message.error(response.message || "No se pudo eliminar el paquete");
          return;
        }
        message.success("Paquete eliminado");
        await fetchPendingPackages();
      },
    });
  };

  const nextMonthlyNumber = monthlyPackageCount + 1;
  const progressTarget = missingForNextRange > 0 ? nextMonthlyNumber + missingForNextRange : nextMonthlyNumber;
  const progressPercent =
    missingForNextRange > 0
      ? Math.max(8, Math.min(100, Math.round((nextMonthlyNumber / progressTarget) * 100)))
      : 100;

  useEffect(() => {
    const fetchSellerConfig = async () => {
      if (!user?.id_vendedor) {
        setLoadingConfig(false);
        return;
      }

      try {
        const [seller, branchPricesResponse] = await Promise.all([
          getSellerAPI(user.id_vendedor),
          getSimplePackageBranchPricesAPI(),
        ]);

        const nextConfig = {
          precio_paquete: Number(seller?.precio_paquete ?? user?.seller_precio_paquete ?? 0),
          amortizacion: Number(seller?.amortizacion ?? user?.seller_amortizacion ?? 0),
          saldo_por_paquete: 0,
        };
        const nextBranches = Array.isArray(seller?.pago_sucursales)
          ? seller.pago_sucursales.filter(
              (branch: any) => branch?.activo !== false && Number(branch?.entrega_simple || 0) > 0
            )
          : [];
        const currentBranchId = localStorage.getItem("sucursalId") || "";
        const defaultOriginId =
          nextBranches.find(
            (branch: any) => String(branch?.id_sucursal?._id || branch?.id_sucursal || "") === String(currentBranchId)
          )?.id_sucursal?._id ||
          nextBranches.find(
            (branch: any) => String(branch?.id_sucursal || "") === String(currentBranchId)
          )?.id_sucursal ||
          nextBranches[0]?.id_sucursal?._id ||
          nextBranches[0]?.id_sucursal ||
          "";

        setSellerConfig(nextConfig);
        setSellerBranches(nextBranches);
        setBranchPrices(Array.isArray(branchPricesResponse?.rows) ? branchPricesResponse.rows : []);
        setSelectedOriginId(String(defaultOriginId || ""));
        setSelectedDestinationId(String(defaultOriginId || ""));
        setRows(resizeDraftRows(MIN_PACKAGES, [], nextConfig));
      } catch (error) {
        console.error(error);
        message.error("No se pudo cargar la configuracion del servicio");
      } finally {
        setLoadingConfig(false);
      }
    };

    void fetchSellerConfig();
  }, [
    user?.id_vendedor,
    user?.seller_amortizacion,
    user?.seller_precio_paquete,
  ]);

  useEffect(() => {
    if (!selectedOriginId) return;

    setSelectedDestinationId((current) =>
      destinationOptions.some((option) => String(option.value) === String(current))
        ? current
        : String(selectedOriginId || "")
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

  useEffect(() => {
    if (!user?.id_vendedor) return;

    const fetchEscalationStatus = async () => {
      try {
        const response = await getSimplePackageEscalationStatusAPI({
          sellerId: user.id_vendedor,
          routeId: getRouteId(selectedOriginId, selectedDestinationId),
        });
        if (response?.success && response?.data) {
          setMonthlyPackageCount(Number(response.data.monthCount || 0));
          setMissingForNextRange(Number(response.data.missingForNextRange || 0));
        }
      } catch (error) {
        console.error(error);
      }
    };

    void fetchEscalationStatus();
  }, [selectedOriginId, selectedDestinationId, routeIdMap, user?.id_vendedor]);

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

  const handlePackageCountChange = (value: number | null) => {
    const nextCount = Math.max(MIN_PACKAGES, Number(value || MIN_PACKAGES));
    setPackageCount(nextCount);
    setRows((prev) => resizeDraftRows(nextCount, prev, sellerConfig));
  };

  const handleApplyDescription = () => {
    const description = String(generalDescription || "").trim();
    if (!description) {
      message.warning("Escribe una descripcion general antes de aplicarla");
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
    message.success("Descripcion aplicada a todos los paquetes");
  };

  const handleApplyDestination = () => {
    if (!selectedDestinationId) {
      message.warning("Selecciona una sucursal destino para aplicarla");
      return;
    }

    setRows((prev) =>
      prev.map((row, index) =>
        createDraftRow(index, sellerConfig, {
          ...row,
          destino_sucursal_id: selectedDestinationId,
          precio_entre_sucursal: getBranchRoutePrice(selectedOriginId, selectedDestinationId),
        })
      )
    );
    message.success("Sucursal destino aplicada a todos los paquetes");
  };

  const handleSubmit = async () => {
    if (!selectedOriginId) {
      message.error("Selecciona una sucursal de origen");
      return;
    }

    const payloadRows = rows.map((row) => ({
      comprador: String(row.comprador || "").trim(),
      telefono_comprador: String(row.telefono_comprador || "").trim(),
      descripcion_paquete: String(row.descripcion_paquete || "").trim(),
      destino_sucursal_id: String(row.destino_sucursal_id || "").trim(),
      package_size: row.package_size,
      amortizacion_vendedor: Number(row.amortizacion_vendedor || 0),
      saldo_por_paquete: Number(row.saldo_por_paquete || 0),
    }));

    for (let index = 0; index < payloadRows.length; index += 1) {
      const row = payloadRows[index];
      if (!row.comprador && !row.telefono_comprador) {
        message.error(`Paquete ${index + 1}: ingresa nombre o celular del comprador`);
        return;
      }
      if (!row.descripcion_paquete) {
        message.error(`Paquete ${index + 1}: la descripcion es obligatoria`);
        return;
      }
      if (!row.destino_sucursal_id) {
        message.error(`Paquete ${index + 1}: selecciona la sucursal destino`);
        return;
      }
      if (Number(row.amortizacion_vendedor || 0) < 0) {
        message.error(`Paquete ${index + 1}: el monto que cubriras del servicio no puede ser menor a 0`);
        return;
      }
      const precioPaqueteActual = Number(rows[index]?.precio_paquete || 0);
      if (Number(row.amortizacion_vendedor || 0) > precioPaqueteActual) {
        message.error(
          `Paquete ${index + 1}: el monto que cubriras del servicio no puede ser mayor al precio del paquete`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const response = await registerSimplePackagesAPI({
        sellerId: user?.id_vendedor,
        originBranchId: selectedOriginId,
        paquetes: payloadRows,
      });

      if (!response.success) {
        message.error(response.message || "No se pudieron registrar los paquetes");
        return;
      }

      message.success(`Se registraron ${response.createdCount || payloadRows.length} paquetes`);
      await fetchPendingPackages();
      setPackageCount(MIN_PACKAGES);
      setGeneralDescription("");
      setSelectedDestinationId(String(selectedOriginId || ""));
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
      <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-3 mb-4">
        <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-md">
          <img src="/box-icon.png" alt="Paquetes" className="w-8 h-8" />
          <h1 className="text-mobile-3xl xl:text-desktop-3xl font-bold text-gray-800">Paquetes del servicio</h1>
        </div>
        <Button
          onClick={() => {
            setPendingModalVisible(true);
            void fetchPendingPackages();
          }}
        >
          Ver pendientes
        </Button>
        <div
          style={{
            minWidth: 280,
            maxWidth: 520,
            border: "1px solid #fed7aa",
            borderRadius: 10,
            padding: "10px 14px",
            background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 58%, #eff6ff 100%)",
            boxShadow: "0 10px 28px rgba(249, 115, 22, 0.12)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <Typography.Text strong style={{ color: "#9a3412" }}>
                Racha mensual: {monthlyPackageCount} paquete(s)
              </Typography.Text>
              <div style={{ color: "#1f2937", fontWeight: 700, marginTop: 2 }}>
                {missingForNextRange > 0
                  ? `Te faltan ${missingForNextRange} paquetes para desbloquear el siguiente rango`
                  : "Ya estas en el mejor rango del mes"}
              </div>
            </div>
            <div
              style={{
                minWidth: 56,
                height: 56,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "#ffedd5",
                color: "#9a3412",
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              <div style={{ textAlign: "center", lineHeight: 1.1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Siguiente paquete:</div>
                <div>#{nextMonthlyNumber}</div>
              </div>
            </div>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: "#e5e7eb", overflow: "hidden", marginTop: 8 }}>
            <div
              style={{
                height: "100%",
                width: `${progressPercent}%`,
                borderRadius: 999,
                background: "linear-gradient(90deg, #f97316 0%, #2563eb 100%)",
              }}
            />
          </div>
        </div>
      </div>

      <Modal
        title="Paquetes simples en espera"
        open={pendingModalVisible}
        onCancel={() => setPendingModalVisible(false)}
        footer={null}
        width={1180}
      >
        <Table
          loading={pendingLoading}
          dataSource={pendingRows}
          rowKey={(row: any) => String(row?._id)}
          pagination={{ pageSize: 8 }}
          scroll={{ x: "max-content" }}
          columns={[
            {
              title: "Comprador",
              dataIndex: "comprador",
              width: 180,
              render: (_: any, row: any) => (
                <Input
                  value={row.comprador}
                  onChange={(event) => patchPendingRow(String(row._id), { comprador: event.target.value })}
                />
              ),
            },
            {
              title: "Celular",
              dataIndex: "telefono_comprador",
              width: 140,
              render: (_: any, row: any) => (
                <Input
                  value={row.telefono_comprador}
                  onChange={(event) =>
                    patchPendingRow(String(row._id), {
                      telefono_comprador: event.target.value.replace(/[^\d]/g, ""),
                    })
                  }
                />
              ),
            },
            {
              title: "Descripcion",
              dataIndex: "descripcion_paquete",
              width: 260,
              render: (_: any, row: any) => (
                <Input.TextArea
                  value={row.descripcion_paquete}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  onChange={(event) =>
                    patchPendingRow(String(row._id), { descripcion_paquete: event.target.value })
                  }
                />
              ),
            },
            {
              title: "Destino",
              dataIndex: "destino_sucursal",
              width: 220,
              render: (_: any, row: any) => (
                <Select
                  style={{ width: "100%" }}
                  value={getBranchId(row.destino_sucursal) || undefined}
                  options={simpleBranchOptions}
                  onChange={(value) => patchPendingRow(String(row._id), { destino_sucursal: value })}
                />
              ),
            },
            {
              title: "Cubre vendedor",
              dataIndex: "amortizacion_vendedor",
              width: 150,
              render: (_: any, row: any) => (
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  addonBefore="Bs."
                  value={Number(row.amortizacion_vendedor || 0)}
                  onChange={(value) =>
                    patchPendingRow(String(row._id), { amortizacion_vendedor: Number(value || 0) })
                  }
                />
              ),
            },
            {
              title: "Saldo paquete",
              dataIndex: "saldo_por_paquete",
              width: 150,
              render: (_: any, row: any) => (
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  addonBefore="Bs."
                  value={Number(row.saldo_por_paquete || 0)}
                  onChange={(value) =>
                    patchPendingRow(String(row._id), { saldo_por_paquete: Number(value || 0) })
                  }
                />
              ),
            },
            {
              title: "Acciones",
              key: "actions",
              fixed: "right",
              width: 180,
              render: (_: any, row: any) => (
                <Space>
                  <Button
                    type="primary"
                    loading={pendingSavingId === String(row._id)}
                    onClick={() => void savePendingRow(row)}
                  >
                    Guardar
                  </Button>
                  <Button danger onClick={() => deletePendingRow(row)}>
                    Borrar
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Modal>

      <Spin spinning={loadingConfig}>
        <Space direction="vertical" size={16} style={{ display: "flex" }}>
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[220px_240px_1fr_auto] gap-3 items-end">
              <div>
                <Typography.Text strong>Numero de paquetes</Typography.Text>
                <InputNumber
                  min={MIN_PACKAGES}
                  style={{ width: "100%", marginTop: 8 }}
                  value={packageCount}
                  onChange={handlePackageCountChange}
                />
              </div>
              <div>
                <Typography.Text strong>Sucursal origen (Donde dejarás el paquete)</Typography.Text>
                <Select
                  style={{ width: "100%", marginTop: 8 }}
                  value={selectedOriginId || undefined}
                  onChange={(value) => setSelectedOriginId(String(value || ""))}
                  options={originOptions}
                  placeholder="Selecciona origen"
                />
              </div>
              <div>
                <Typography.Text strong>Sucursal destino (Donde recogerá tu cliente)</Typography.Text>
                <Select
                  style={{ width: "100%", marginTop: 8 }}
                  value={selectedDestinationId || undefined}
                  onChange={(value) => setSelectedDestinationId(String(value || ""))}
                  options={destinationOptions}
                  placeholder="Selecciona destino"
                  disabled={!selectedOriginId}
                />
              </div>
              <Button onClick={handleApplyDestination} disabled={!selectedOriginId || !selectedDestinationId}>
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
                  placeholder="Ej: Ropa otoño, lote abril, accesorios pequeños"
                />
              </div>
              <Button onClick={handleApplyDescription}>Usar en todos</Button>
            </div>
          </Card>

          <Card bodyStyle={{ padding: 0 }}>
            <div className="hidden md:block" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ ...tableCellStyle, width: 72 }}>#</th>
                    <th style={tableCellStyle}>Nombre del comprador</th>
                    <th style={tableCellStyle}>Descripcion del paquete</th>
                    <th style={tableCellStyle}>Celular</th>
                    <th style={tableCellStyle}>Sucursal destino</th>
                    <th style={tableCellStyle}>Monto que cubriras del servicio</th>
                    <th style={tableCellStyle}>Saldo del paquete</th>
                    <th style={tableCellStyle}>Precio del envio (sujeto a variacion segun el tamaño del paquete)</th>
                    <th style={tableCellStyle}>Precio total del servicio por paquete (sujeto a variacion segun el tamaño del paquete)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.key}>
                      <td style={tableCellStyle}>
                        <Typography.Text strong>{monthlyPackageCount + index + 1}</Typography.Text>
                      </td>
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
                          placeholder="Descripcion"
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
                      <td style={tableCellStyle}>
                        <Select
                          style={{ width: "100%" }}
                          value={row.destino_sucursal_id || undefined}
                          options={destinationOptions}
                          placeholder="Destino"
                          disabled={!selectedOriginId}
                          onChange={(value) =>
                            updateRow(index, { destino_sucursal_id: String(value || "") })
                          }
                        />
                      </td>
                      <td style={tableCellStyle}>
                        <InputNumber
                          min={0}
                          style={{ width: "100%" }}
                          addonBefore="Bs."
                          value={Number(row.amortizacion_vendedor || 0)}
                          onChange={(value) =>
                            updateRow(index, {
                              amortizacion_vendedor: Math.min(
                                Number(row.precio_paquete || 0),
                                Math.max(0, Number(value || 0))
                              ),
                            })
                          }
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
                        <Input
                          value={`Bs. ${Number(row.precio_entre_sucursal || 0).toFixed(2)}`}
                          readOnly
                        />
                      </td>
                      <td style={tableCellStyle}>
                        <Input value={`Bs. ${Number(row.precio_total || 0).toFixed(2)}`} readOnly />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden p-3 space-y-3">
              {rows.map((row, index) => (
                <div key={row.key} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <Typography.Text strong>Paquete #{monthlyPackageCount + index + 1}</Typography.Text>
                    <Typography.Text type="secondary">
                      Total: Bs. {Number(row.precio_total || 0).toFixed(2)}
                    </Typography.Text>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Typography.Text strong>Nombre del comprador</Typography.Text>
                      <Input
                        className="mt-1"
                        value={row.comprador}
                        placeholder="Nombre del comprador"
                        onChange={(event) => updateRow(index, { comprador: event.target.value })}
                      />
                    </div>
                    <div>
                      <Typography.Text strong>Descripcion del paquete</Typography.Text>
                      <Input.TextArea
                        className="mt-1"
                        value={row.descripcion_paquete}
                        placeholder="Descripcion"
                        autoSize={{ minRows: 2, maxRows: 5 }}
                        onChange={(event) => updateRow(index, { descripcion_paquete: event.target.value })}
                      />
                    </div>
                    <div>
                      <Typography.Text strong>Celular</Typography.Text>
                      <Input
                        className="mt-1"
                        value={row.telefono_comprador}
                        placeholder="Celular"
                        onChange={(event) =>
                          updateRow(index, {
                            telefono_comprador: event.target.value.replace(/[^\d]/g, ""),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Typography.Text strong>Sucursal destino</Typography.Text>
                      <Select
                        className="mt-1"
                        style={{ width: "100%" }}
                        value={row.destino_sucursal_id || undefined}
                        options={destinationOptions}
                        placeholder="Destino"
                        disabled={!selectedOriginId}
                        onChange={(value) => updateRow(index, { destino_sucursal_id: String(value || "") })}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Typography.Text strong>Monto que cubriras del servicio</Typography.Text>
                        <InputNumber
                          className="mt-1"
                          min={0}
                          style={{ width: "100%" }}
                          addonBefore="Bs."
                          value={Number(row.amortizacion_vendedor || 0)}
                          onChange={(value) =>
                            updateRow(index, {
                              amortizacion_vendedor: Math.min(
                                Number(row.precio_paquete || 0),
                                Math.max(0, Number(value || 0))
                              ),
                            })
                          }
                        />
                      </div>
                      <div>
                        <Typography.Text strong>Saldo del paquete</Typography.Text>
                        <InputNumber
                          className="mt-1"
                          min={0}
                          style={{ width: "100%" }}
                          addonBefore="Bs."
                          value={Number(row.saldo_por_paquete || 0)}
                          onChange={(value) =>
                            updateRow(index, { saldo_por_paquete: Math.max(0, Number(value || 0)) })
                          }
                        />
                      </div>
                      <div>
                        <Typography.Text strong>Precio del envio</Typography.Text>
                        <Input
                          className="mt-1"
                          value={`Bs. ${Number(row.precio_entre_sucursal || 0).toFixed(2)}`}
                          readOnly
                        />
                      </div>
                      <div>
                        <Typography.Text strong>Precio total del servicio</Typography.Text>
                        <Input className="mt-1" value={`Bs. ${Number(row.precio_total || 0).toFixed(2)}`} readOnly />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div className="flex flex-col md:flex-row md:justify-end gap-2">
            <Button
              onClick={() => {
                setPackageCount(MIN_PACKAGES);
                setGeneralDescription("");
                setSelectedDestinationId(String(selectedOriginId || ""));
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
