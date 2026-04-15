import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Space,
} from "antd";
import {
  PlusOutlined,
  PhoneOutlined,
  MailOutlined,
  PercentageOutlined,
} from "@ant-design/icons";
import { useContext, useEffect, useState } from "react";
import dayjs from "dayjs";

import {
  getProductsEntryAmount,
  updateEntry,
  deleteEntryProductsAPI,
} from "../../../api/entry";
import {
  getSalesBySellerIdAPI,
  updateSale,
  deleteSalesAPI,
  deleteSaleByIdAPI,
  updateSaleByIdAPI,
} from "../../../api/sales";
import {
  getPaymentProofsBySellerIdAPI,
  getSellerAPI,
  getSellerDebtsAPI,
  updateSellerAPI,
} from "../../../api/seller";
import { getSucursalsAPI } from "../../../api/sucursal";
import { getShipingByIdsAPI } from "../../../api/shipping";
import { getSellerAccountingSimplePackagesAPI } from "../../../api/simplePackage";

import { UserContext } from "../../../context/userContext";

import BranchFields from "./BranchFields";
import SellerHeader from "./SellerHeader";
import StatsCards from "./StatsCards";
import SalesSection from "./SalesSection";
import EntryHistorySection from "./EntryHistorySection";
import PaymentProofSection from "./PaymentProofSection";
import ActionButtons from "./ActionButtons";
import SellerDebtTable from "./SellerDebtTable";
import {
  branchesEnableCommissionService,
  branchesEnableSimplePackageService,
} from "../../../utils/sellerServiceAccess";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SellerInfoPage = ({ visible, onSuccess, onCancel, seller }: any) => {
  const [form] = Form.useForm();

  /* ───── estado global para submit ───── */
  const [loading, setLoading] = useState(false);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [sucursalesLoaded, setSucursalesLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  /* datos agregados de sub-componentes */
  const [salesData, setSalesData] = useState<any[]>([]);
  const [deletedSales, setDeletedSales] = useState<any[]>([]);
  const [entryData, setEntryData] = useState<any[]>([]);
  const [deletedEntryData, setDeletedEntryData] = useState<any[]>([]);
  const [paymentProofs, setPaymentProofs] = useState<any[]>([]);
  const [sellerDebts, setSellerDebts] = useState<any[]>([]);
  const [sellerMetrics, setSellerMetrics] = useState<{
    saldo_pendiente: number;
    deuda: number;
    pago_pendiente: number;
  } | null>(null);

  const { user } = useContext(UserContext);
  const isSeller = user?.role === "seller";
  const [serviceFlags, setServiceFlags] = useState({
    hasCommissionService: false,
    hasSimplePackageServiceEnabled: false,
  });

  const syncServiceFlags = (branches: any[] = []) => {
    setServiceFlags({
      hasCommissionService: branchesEnableCommissionService(branches),
      hasSimplePackageServiceEnabled: branchesEnableSimplePackageService(branches),
    });
  };

  const buildSellerFormValues = (sellerData: any) => {
    const branches = sellerData?.pago_sucursales?.length
      ? sellerData.pago_sucursales.map((sucursal: any) => ({
          ...sucursal,
          almacenamiento: sucursal.alquiler,
          fecha_ingreso: sucursal.fecha_ingreso ? dayjs(sucursal.fecha_ingreso) : null,
          fecha_salida: sucursal.fecha_salida ? dayjs(sucursal.fecha_salida) : null,
        }))
      : [{}];

    return {
      telefono: sellerData?.telefono,
      fecha_vigencia: sellerData?.fecha_vigencia ? dayjs(sellerData.fecha_vigencia, "D-M-YYYY") : null,
      mail: sellerData?.mail || "",
      comision_porcentual: sellerData?.comision_porcentual || 0,
      amortizacion: sellerData?.amortizacion || 0,
      precio_paquete: sellerData?.precio_paquete || 0,
      sucursales: branches,
    };
  };

  /* ───── cargar sucursales y luego todo ───── */
  useEffect(() => {
    if (seller.key) fetchSucursales();
  }, [seller]);

  useEffect(() => {
    if (sucursalesLoaded) {
      fetchSales();
      fetchEntryProducts();
      fetchPaymentProofs(seller.key);
      fetchSellerDebts(seller.key);
    }
  }, [sucursalesLoaded, refreshKey]);

  useEffect(() => {
    const fetchSellerMetrics = async () => {
      if (!seller?.key) return;
      try {
        const detail = await getSellerAPI(String(seller.key));
        if (!detail) {
          setSellerMetrics(null);
          return;
        }

        const saldoPendiente = Number(detail.saldo_pendiente ?? 0);
        const deuda = Number(detail.deuda ?? 0);
        const pagoPendiente = Number(detail.pago_pendiente ?? saldoPendiente - deuda);

        setSellerMetrics({
          saldo_pendiente: Number.isFinite(saldoPendiente) ? saldoPendiente : 0,
          deuda: Number.isFinite(deuda) ? deuda : 0,
          pago_pendiente: Number.isFinite(pagoPendiente) ? pagoPendiente : 0,
        });
      } catch (e) {
        console.error("Error al cargar metricas del vendedor", e);
        setSellerMetrics(null);
      }
    };

    fetchSellerMetrics();
  }, [seller?.key, refreshKey]);

  useEffect(() => {
    const values = buildSellerFormValues(seller);
    form.resetFields();
    form.setFieldsValue(values);
    syncServiceFlags(values.sucursales || []);
  }, [form, seller]);


  /* ─────────── solicitudes ─────────── */
  const fetchSucursales = async () => {
    try {
      setSucursales(await getSucursalsAPI());
      setSucursalesLoaded(true);
    } catch (e) {
      console.error("Error sucursales", e);
    }
  };

  const fetchSellerDebts = async (sellerId: string) => {
    try {
      const res = await getSellerDebtsAPI(sellerId);
      if (res?.success) setSellerDebts(res.data);
    } catch (e) {
      console.error("Error al cargar deudas del vendedor", e);
    }
  };

  const fetchSales = async () => {
    try {
      const [res, simpleRes] = await Promise.all([
        getSalesBySellerIdAPI(seller.key),
        getSellerAccountingSimplePackagesAPI({ sellerId: String(seller.key) }),
      ]);
      const regularSales: any[] = Array.isArray(res)
        ? res.filter((sale) => sale.id_pedido.estado_pedido !== "En Espera")
        : [];
      const simpleSales: any[] = Array.isArray(simpleRes?.rows)
        ? simpleRes.rows.map((row: any) => ({
            key: `simple-${row._id}`,
            producto: "Entrega simple",
            nombre_variante: row.descripcion_paquete || "Paquete simple",
            precio_unitario: Number(row.accounting_amount ?? 0),
            cantidad: 1,
            utilidad: 0,
            id_venta: `simple-${row._id}`,
            id_vendedor: seller.key,
            id_pedido: {
              _id: `simple-${row._id}`,
              estado_pedido: row.estado_pedido || "Entregado",
              pagado_al_vendedor: false,
              cargo_delivery: 0,
              adelanto_cliente: 0,
            },
            id_sucursal:
              String(row?.origen_sucursal?._id || row?.origen_sucursal || row?.sucursal || ""),
            deposito_realizado: !!row.deposito_realizado,
            cliente: row.comprador || "",
            fecha_pedido: row.fecha_pedido,
            tipo: "Simple",
            es_entrega_simple: true,
            sucursal: row?.origen_sucursal?.nombre || "Sucursal no encontrada",
          }))
        : [];
      const pedidosIds = regularSales.map((s) => s.id_pedido);
      const uniquePedidos = Array.from(new Set(pedidosIds));

      const shipRes =
        uniquePedidos.length > 0
          ? await getShipingByIdsAPI(uniquePedidos.map((pedido) => pedido._id))
          : { success: true, data: [] };

      const finalRegular = regularSales.map((sale) => {
        const lugarEntrega =
          shipRes.success &&
          shipRes.data.find((s: any) => s.id_pedido === sale.id_pedido)
            ?.lugar_entrega;

        const esVenta =
          lugarEntrega &&
          sucursales.some(
            (s) => s.nombre.toLowerCase() === lugarEntrega.toLowerCase()
          );

        return {
          ...sale,
          tipo: esVenta ? "Venta" : "Pedido",
          subtotal: sale.precio_unitario * sale.cantidad,
          comision_porcentual: seller.comision_porcentual || 0,
          sucursal:
            sucursales.find((s) => s._id === sale.id_sucursal)?.nombre ||
            "Sucursal no encontrada",
          key: `${sale.id_producto}-${sale.fecha_pedido}`,
        };
      });

      setSalesData([...finalRegular, ...simpleSales]);
    } catch (e) {
      console.error("Error ventas", e);
    }
  };

  const handleUpdateSale = async (id: string, fields: any) => {
    const sucursalId = localStorage.getItem("sucursalId");
    const res = await updateSaleByIdAPI(id, {
      ...fields,
      id_sucursal: sucursalId,
    });
    if (res?.success) {
      message.success("Venta actualizada correctamente");
      await fetchSales(); // Refresca ventas
      onSuccess();
    } else {
      message.error("Error al actualizar la venta");
    }
  };

  const handleDeleteSale = async (id: string) => {
    const id_sucursal = localStorage.getItem("sucursalId");
    const res = await deleteSaleByIdAPI(id, id_sucursal);
    if (res?.success) {
      message.success("Venta eliminada correctamente");
      await fetchSales(); // Refresca ventas
      onSuccess();
    } else {
      message.error("Error al eliminar la venta");
    }
  };

  const fetchEntryProducts = async () => {
    try {
      const res = await getProductsEntryAmount(seller.key);
      setEntryData(
        res.map((p: any) => ({
          ...p,
          key: p.id_ingreso,
          nombreSucursal:
            sucursales.find((s) => s._id === p.sucursal).nombre ||
            "Sucursal no encontrada",
        }))
      );
    } catch (e) {
      console.error("Error entry", e);
    }
  };

  const fetchPaymentProofs = async (sellerId: string) => {
    try {
      const res = await getPaymentProofsBySellerIdAPI(sellerId);
      setPaymentProofs(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Error proofs", e);
    }
  };

  /* ─────────── submit final ─────────── */
  const handleFinish = async (formValues: any) => {
    setLoading(true);
    try {
      /* 1) seller */
      const resSeller = await updateSellerAPI(seller.key, {
        ...formValues,
        pago_sucursales: formValues.sucursales.map((sucursal: any) => ({
          ...sucursal,
          alquiler: sucursal.almacenamiento,
        })),
      });
      if (!resSeller?.success) {
        message.error("Error al editar vendedor");
        setLoading(false);
        return;
      }
      setRefreshKey((prev) => prev + 1);

      /* 2) ventas */
      await updateSale(salesData);
      if (deletedSales.length) await deleteSalesAPI(deletedSales);

      /* 3) ingresos */
      await updateEntry(entryData);
      if (deletedEntryData.length)
        await deleteEntryProductsAPI(deletedEntryData);

      message.success("Cambios guardados");
      onSuccess();
    } catch (e) {
      console.error(e);
      message.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  /* ─────────── render ─────────── */
  const saldoPendienteValue = Number(
    sellerMetrics?.saldo_pendiente ?? (seller as any)?.saldo_pendiente ?? 0
  );
  const deudaValue = Number(
    sellerMetrics?.deuda ?? (seller as any)?.deuda ?? 0
  );
  const pagoPendienteFromApi = Number(
    sellerMetrics?.pago_pendiente ?? (seller as any)?.pago_pendiente
  );
  const pagoPendienteFromTable = Number((seller as any)?.pagoTotalInt);
  const pagoPendienteValue = Number.isFinite(pagoPendienteFromApi)
    ? pagoPendienteFromApi
    : Number.isFinite(pagoPendienteFromTable)
      ? pagoPendienteFromTable
      : saldoPendienteValue - deudaValue;
  const ultimaFechaPago = paymentProofs.reduce<dayjs.Dayjs | null>(
    (latestProofDate, proof) => {
      const rawDate = proof?.createdAt ?? proof?.fecha_emision;
      if (!rawDate) return latestProofDate;

      const currentProofDate = dayjs(rawDate);
      if (!currentProofDate.isValid()) return latestProofDate;

      if (!latestProofDate || currentProofDate.isAfter(latestProofDate)) {
        return currentProofDate;
      }

      return latestProofDate;
    },
    null
  );
  const ultimaFechaPagoLabel = ultimaFechaPago
    ? ultimaFechaPago.format("DD/MM/YYYY")
    : null;
  const sellerHeaderName = isSeller
    ? String(user?.nombre_vendedor || seller.nombre || "").trim()
    : seller.nombre;

  return (
    <div>
      <SellerHeader name={sellerHeaderName} isSeller={isSeller} />

      <StatsCards
        pagoPendiente={pagoPendienteValue}
        deuda={deudaValue}
        saldoPendiente={saldoPendienteValue}
        ultimaFechaPago={ultimaFechaPagoLabel}
      />

      <Form
        form={form}
        onFinish={handleFinish}
        layout="vertical"
        onValuesChange={(_, allValues) => {
          syncServiceFlags(allValues?.sucursales || []);
        }}
        initialValues={{
          telefono: seller.telefono,
          fecha_vigencia: dayjs(seller.fecha_vigencia, "D-M-YYYY"),
          mail: seller.mail || "",
          comision_porcentual: seller.comision_porcentual || 0,
          amortizacion: seller.amortizacion || 0,
          precio_paquete: seller.precio_paquete || 0,
          sucursales: seller.pago_sucursales.length
            ? seller.pago_sucursales.map((sucursal: any) => ({
                ...sucursal,
                almacenamiento: sucursal.alquiler,
                fecha_ingreso: sucursal.fecha_ingreso
                  ? dayjs(sucursal.fecha_ingreso)
                  : null,
                fecha_salida: sucursal.fecha_salida
                  ? dayjs(sucursal.fecha_salida)
                  : null,
              }))
            : [{}],
        }}
      >
        {/* Información del vendedor */}
        <Card style={{ marginBottom: 24 }} className="seller-info-card">
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item name="mail" label="Correo electrónico">
                <Input
                  prefix={<MailOutlined />}
                  style={{ width: "100%" }}
                  placeholder="correo@ejemplo.com"
                  type="email"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="telefono" label="Teléfono">
                <InputNumber
                  prefix={<PhoneOutlined />}
                  style={{ width: "100%" }}
                  placeholder="Número de teléfono"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item name="fecha_vigencia" label="Fecha de vigencia">
                <DatePicker
                  format="DD/MM/YYYY"
                  disabled={isSeller}
                  style={{ width: "100%" }}
                  placeholder="Seleccionar fecha"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item name="comision_porcentual" label="Comisión">
                <InputNumber
                  prefix={<PercentageOutlined />}
                  min={0}
                  max={100}
                  disabled={isSeller || !serviceFlags.hasCommissionService}
                  style={{ width: "100%" }}
                  placeholder="0"
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="amortizacion"
                label="Amortización"
                dependencies={["precio_paquete"]}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!serviceFlags.hasSimplePackageServiceEnabled) {
                        return Promise.resolve();
                      }
                      const precioPaquete = Number(getFieldValue("precio_paquete") || 0);
                      if (Number(value || 0) <= precioPaquete) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("La amortización no puede ser mayor al precio por paquete")
                      );
                    },
                  }),
                ]}
              >
                <InputNumber
                  min={0}
                  disabled={isSeller || !serviceFlags.hasSimplePackageServiceEnabled}
                  style={{ width: "100%" }}
                  placeholder="0"
                  addonBefore="Bs."
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="precio_paquete" label="Precio por paquete">
                <InputNumber
                  min={0}
                  disabled={isSeller || !serviceFlags.hasSimplePackageServiceEnabled}
                  style={{ width: "100%" }}
                  placeholder="0"
                  addonBefore="Bs."
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Servicios por sucursal */}
        <Card
          title="Servicios por sucursal"
          style={{ marginBottom: 24 }}
          extra={
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => {
                const curr = form.getFieldValue("sucursales") || [];
                form.setFieldsValue({ sucursales: [...curr, {}] });
              }}
              disabled={isSeller}
            >
              Añadir sucursal
            </Button>
          }
        >
          <Form.List name="sucursales">
            {(fields, { remove }) => (
              <Space direction="vertical" style={{ width: "100%" }}>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    style={{
                      backgroundColor: "#fafafa",
                      border: "1px solid #e8e8e8",
                    }}
                  >
                    <BranchFields
                      field={field}
                      remove={remove}
                      sucursalOptions={sucursales}
                      form={form}
                      isSeller={isSeller}
                    />
                  </Card>
                ))}
              </Space>
            )}
          </Form.List>
        </Card>

        {/* Secciones independientes */}
        {!(isSeller && serviceFlags.hasSimplePackageServiceEnabled) && (
          <SalesSection
            initialSales={salesData}
            onSalesChange={setSalesData}
            onDeletedSalesChange={() => {}}
            onUpdateNoPagadasTotal={() => {}}
            onUpdateHistorialTotal={() => {}}
            isSeller={isSeller}
            onUpdateOneSale={handleUpdateSale}
            onDeleteOneSale={handleDeleteSale}
          />
        )}

        {!(isSeller && serviceFlags.hasSimplePackageServiceEnabled) && (
          <EntryHistorySection initialEntries={entryData} />
        )}

        <SellerDebtTable
          data={sellerDebts}
          setRefreshKey={setRefreshKey}
          isSeller={isSeller}
        />

        <PaymentProofSection proofs={paymentProofs} sellerId={seller.key} />

        {/* Botones */}
        <Form.Item>
          <ActionButtons
            loading={loading}
            isSeller={isSeller}
            onCancel={onCancel}
          />
        </Form.Item>
      </Form>
    </div>
  );
};

export default SellerInfoPage;
