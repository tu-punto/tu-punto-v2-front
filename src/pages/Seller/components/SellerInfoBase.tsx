import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Alert,
  Image,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Space,
  Tag,
  Upload,
} from "antd";
import {
  PlusOutlined,
  PhoneOutlined,
  MailOutlined,
  PercentageOutlined,
  UploadOutlined,
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
  declineSellerServiceAPI,
  requestSellerPaymentAPI,
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

const parseSellerDate = (value: any) => {
  if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/").map(Number);
    return dayjs(new Date(year, month - 1, day));
  }
  return dayjs(value);
};

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
  const [paymentRequest, setPaymentRequest] = useState({
    qr_pago_url: seller?.qr_pago_url || "",
    fecha_solicitud_pago: seller?.fecha_solicitud_pago || null,
    fecha_pago_asignada: seller?.fecha_pago_asignada || null,
  });
  const [paymentRequestModalOpen, setPaymentRequestModalOpen] = useState(false);
  const [paymentRequestLoading, setPaymentRequestLoading] = useState(false);
  const [declineServiceModalOpen, setDeclineServiceModalOpen] = useState(false);
  const [declineServiceLoading, setDeclineServiceLoading] = useState(false);
  const [declineServiceDate, setDeclineServiceDate] = useState(
    seller?.declinacion_servicio_fecha || null
  );
  const [qrFileList, setQrFileList] = useState<any[]>([]);

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
    setPaymentRequest({
      qr_pago_url: seller?.qr_pago_url || "",
      fecha_solicitud_pago: seller?.fecha_solicitud_pago || null,
      fecha_pago_asignada: seller?.fecha_pago_asignada || null,
    });
    setDeclineServiceDate(seller?.declinacion_servicio_fecha || null);
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
      const regularPedidoIds = new Set(
        regularSales
          .map((sale) => String(sale?.id_pedido?._id || sale?.id_pedido || "").trim())
          .filter(Boolean)
      );
      const simpleSales: any[] = Array.isArray(simpleRes?.rows)
        ? simpleRes.rows
            .filter((row: any) => {
              const pedidoRef = String(row?.pedido_ref?._id || row?.pedido_ref || "").trim();
              return !pedidoRef || !regularPedidoIds.has(pedidoRef);
            })
            .map((row: any) => ({
              key: `simple-${row._id}`,
              producto: "Entrega simple",
              nombre_variante: row.descripcion_paquete || "Paquete simple",
              precio_unitario: Number(row.saldo_por_paquete ?? 0),
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

  const paymentDateLabel = paymentRequest.fecha_pago_asignada
    ? dayjs(paymentRequest.fecha_pago_asignada).format("DD/MM/YYYY")
    : "";
  const hasPendingPaymentRequest = Boolean(paymentRequest.fecha_pago_asignada);
  const selectedQrFile = qrFileList?.[0]?.originFileObj;
  const serviceEndDate = parseSellerDate(seller?.fecha_vigencia);
  const serviceDeclineDeadline = serviceEndDate.isValid()
    ? serviceEndDate.subtract(5, "day").endOf("day")
    : null;
  const serviceStockPickupDeadline = serviceEndDate.isValid()
    ? serviceEndDate.add(5, "day")
    : null;
  const canDeclineService =
    isSeller &&
    serviceEndDate.isValid() &&
    !declineServiceDate &&
    (!serviceDeclineDeadline || !dayjs().isAfter(serviceDeclineDeadline));
  const serviceDeclineDisabledReason = declineServiceDate
    ? "Ya informaste que declinaras el servicio."
    : serviceDeclineDeadline
    ? `Disponible hasta el ${serviceDeclineDeadline.format("DD/MM/YYYY")}.`
    : "Fecha de vigencia no valida.";

  const handleRequestPayment = async () => {
    if (!seller?.key) return;
    if (!selectedQrFile && !paymentRequest.qr_pago_url) {
      message.warning("Carga tu QR para solicitar el cobro.");
      return;
    }

    const payload = new FormData();
    if (selectedQrFile) {
      payload.append("qr_pago", selectedQrFile);
    }

    setPaymentRequestLoading(true);
    try {
      const res = await requestSellerPaymentAPI(String(seller.key), payload);
      if (!res?.success) throw new Error("No se pudo registrar la solicitud");

      const updatedSeller = res.data?.seller || {};
      setPaymentRequest({
        qr_pago_url: updatedSeller.qr_pago_url || paymentRequest.qr_pago_url,
        fecha_solicitud_pago: updatedSeller.fecha_solicitud_pago || new Date().toISOString(),
        fecha_pago_asignada: updatedSeller.fecha_pago_asignada || res.data?.fecha_pago_asignada,
      });
      setQrFileList([]);
      setPaymentRequestModalOpen(false);

      const assignedDate = dayjs(
        updatedSeller.fecha_pago_asignada || res.data?.fecha_pago_asignada
      ).format("DD/MM/YYYY");
      message.success(`Solicitud registrada. Tu pago fue asignado para el ${assignedDate}.`);
    } catch (error) {
      console.error(error);
      message.error("No se pudo solicitar el cobro.");
    } finally {
      setPaymentRequestLoading(false);
    }
  };

  const handleDeclineService = async () => {
    if (!seller?.key) return;

    setDeclineServiceLoading(true);
    try {
      const res = await declineSellerServiceAPI(String(seller.key));
      if (!res?.success) throw new Error("No se pudo registrar la declinacion");

      const updatedSeller = res.data?.seller || {};
      setDeclineServiceDate(
        updatedSeller.declinacion_servicio_fecha || new Date().toISOString()
      );
      setDeclineServiceModalOpen(false);
      message.success("Declinacion del servicio registrada");
      onSuccess();
    } catch (error) {
      console.error(error);
      message.error("No se pudo declinar el servicio.");
    } finally {
      setDeclineServiceLoading(false);
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
  const saldoAcumuladoValue = Number(saldoPendienteValue.toFixed(2));
  const deudaValue = Number(
    sellerMetrics?.deuda ?? (seller as any)?.deuda ?? 0
  );
  const pagoPendienteValue = Number((saldoAcumuladoValue - deudaValue).toFixed(2));
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
        saldoPendiente={saldoAcumuladoValue}
        ultimaFechaPago={ultimaFechaPagoLabel}
      />

      {isSeller && (
        <div className="mb-5 flex flex-col items-center gap-3">
          {hasPendingPaymentRequest && (
            <Alert
              type="info"
              showIcon
              message={`Tu pago esta pendiente y fue asignado para el ${paymentDateLabel}.`}
              style={{ width: "100%", maxWidth: 620 }}
            />
          )}
          <Button
            type="primary"
            size="large"
            disabled={hasPendingPaymentRequest}
            onClick={() => setPaymentRequestModalOpen(true)}
          >
            Solicitar cobro
          </Button>
          {declineServiceDate ? (
            <Alert
              type="warning"
              showIcon
              message="Informaste que declinaras el servicio."
              description={
                serviceStockPickupDeadline?.isValid()
                  ? `Recoge tu stock y pedidos hasta el ${serviceStockPickupDeadline.format("DD/MM/YYYY")}.`
                  : undefined
              }
              style={{ width: "100%", maxWidth: 620 }}
            />
          ) : (
            <Button
              danger
              size="large"
              disabled={!canDeclineService}
              onClick={() => setDeclineServiceModalOpen(true)}
            >
              Declinar servicio
            </Button>
          )}
          {!canDeclineService && !declineServiceDate ? (
            <Tag color="default">{serviceDeclineDisabledReason}</Tag>
          ) : null}
        </div>
      )}

      <Modal
        title="Solicitar cobro"
        open={paymentRequestModalOpen}
        onCancel={() => {
          setPaymentRequestModalOpen(false);
          setQrFileList([]);
        }}
        onOk={handleRequestPayment}
        okText="Enviar solicitud"
        cancelText="Cancelar"
        confirmLoading={paymentRequestLoading}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Alert
            type="warning"
            showIcon
            message="El QR debe tener una vigencia de al menos 6 meses y en la descripcion del QR debe figurar tu nombre."
          />

          {paymentRequest.qr_pago_url && (
            <div>
              <div className="mb-2 font-medium">QR cargado actualmente</div>
              <Image
                src={paymentRequest.qr_pago_url}
                alt="QR de pago del vendedor"
                width={220}
                style={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
            </div>
          )}

          <Upload
            accept="image/png,image/jpeg,image/jpg,image/webp"
            beforeUpload={() => false}
            maxCount={1}
            fileList={qrFileList}
            onChange={({ fileList }) => setQrFileList(fileList)}
          >
            <Button icon={<UploadOutlined />}>
              {paymentRequest.qr_pago_url ? "Reemplazar QR" : "Cargar QR"}
            </Button>
          </Upload>

          {paymentRequest.qr_pago_url && (
            <Tag color="blue">Puedes enviar la solicitud con el QR guardado si sigue vigente.</Tag>
          )}
        </Space>
      </Modal>

      <Modal
        title="Declinar el servicio"
        open={declineServiceModalOpen}
        onCancel={() => setDeclineServiceModalOpen(false)}
        onOk={handleDeclineService}
        okText="Declinar el servicio"
        okButtonProps={{ danger: true }}
        cancelText="Cancelar"
        confirmLoading={declineServiceLoading}
      >
        <p>
          Esta seguro que desea abandonar el servicio? Se notificara a los encargados que a partir del{" "}
          {serviceEndDate.isValid() ? serviceEndDate.format("DD/MM/YYYY") : "[fecha de vigencia]"} ya no usara el servicio para que no se proceda con la renovacion del mismo. Esto implica que hasta el{" "}
          {serviceStockPickupDeadline?.isValid()
            ? serviceStockPickupDeadline.format("DD/MM/YYYY")
            : "[fecha de vigencia + 5 dias]"}{" "}
          debe recoger su stock y sus pedidos del punto de entrega.
        </p>
      </Modal>

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
