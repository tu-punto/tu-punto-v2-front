import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  InputNumber,
  message,
  Row,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useContext, useEffect, useState } from 'react';
import dayjs from 'dayjs';

import {
  getProductsEntryAmount,
  updateEntry,
  deleteEntryProductsAPI,
} from '../../../api/entry';
import { getPaymentProofsBySellerIdAPI } from '../../../api/paymentProof';
import {
  getSalesBySellerIdAPI,
  updateSale,
  deleteSalesAPI,
  deleteSaleByIdAPI,
  updateSaleByIdAPI,
} from '../../../api/sales';
import { getSellerDebtsAPI, updateSellerAPI } from '../../../api/seller';
import { getSucursalsAPI } from '../../../api/sucursal';
import { getShipingByIdsAPI } from '../../../api/shipping';

import { UserContext } from '../../../context/userContext';

import BranchFields from './BranchFields';
import SellerHeader from './SellerHeader';
import StatsCards from './StatsCards';
import SalesSection from './SalesSection';
import EntryHistorySection from './EntryHistorySection';
import PaymentProofSection from './PaymentProofSection';
import ActionButtons from './ActionButtons';
import SellerDebtTable from './SellerDebtTable';

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

  const { user } = useContext(UserContext);
  const isSeller = user?.role === 'seller';

  /* ───── cargar sucursales y luego todo ───── */
  useEffect(() => { if (seller.key) fetchSucursales(); }, [seller]);


  useEffect(() => {
    if (sucursalesLoaded) {
      fetchSales();
      fetchEntryProducts();
      fetchPaymentProofs(seller.key);
      fetchSellerDebts(seller.key);
    }
  }, [sucursalesLoaded, refreshKey]);

  /* ─────────── solicitudes ─────────── */
  const fetchSucursales = async () => {
    try {
      setSucursales(await getSucursalsAPI());
      setSucursalesLoaded(true);
    } catch (e) { console.error('Error sucursales', e); }
  };

  const fetchSellerDebts = async (sellerId: string) => {
    try {
      const res = await getSellerDebtsAPI(sellerId);
      if (res?.success) setSellerDebts(res.data);
    } catch (e) {
      console.error('Error al cargar deudas del vendedor', e);
    }
  };

  const fetchSales = async () => {
    try {
      const res = await getSalesBySellerIdAPI(seller.key);
      const sales: any[] = Array.isArray(res) ? res : [];
      const pedidosIds = sales.map(s => s.id_pedido);
      const uniquePedidos = Array.from(new Set(pedidosIds));

      const shipRes = await getShipingByIdsAPI(uniquePedidos.map(pedido => pedido._id));

      const final = sales.map(sale => {
        const lugarEntrega =
          shipRes.success &&
          shipRes.data.find((s: any) => s.id_pedido === sale.id_pedido)
            ?.lugar_entrega;

        const esVenta = lugarEntrega &&
          sucursales.some(s =>
            s.nombre.toLowerCase() === lugarEntrega.toLowerCase());

        return {
          ...sale,
          tipo: esVenta ? 'Venta' : 'Pedido',
          subtotal: sale.precio_unitario * sale.cantidad,
          key: `${sale.id_producto}-${sale.fecha_pedido}`,
        };
      });

      setSalesData(final);
    } catch (e) { console.error('Error ventas', e); }
  };

  const handleUpdateSale = async (id: string, fields: any) => {
    const sucursalId = localStorage.getItem('sucursalId');
    const res = await updateSaleByIdAPI(id, { ...fields, id_sucursal: sucursalId });
    if (res?.success) {
      message.success("Venta actualizada correctamente");
      await fetchSales(); // Refresca ventas
    } else {
      message.error("Error al actualizar la venta");
    }
  };

  const handleDeleteSale = async (id: string) => {

    const id_sucursal = localStorage.getItem('sucursalId');
    const res = await deleteSaleByIdAPI(id, id_sucursal);
    if (res?.success) {
      message.success("Venta eliminada correctamente");
      await fetchSales(); // Refresca ventas
    } else {
      message.error("Error al eliminar la venta");
    }
  };

  const fetchEntryProducts = async () => {
    try {
      const res = await getProductsEntryAmount(seller.key);
      setEntryData(res.map((p: any) => ({ ...p, key: p.id_ingreso })));
    } catch (e) { console.error('Error entry', e); }
  };

  const fetchPaymentProofs = async (sellerId: string) => {
    try {
      const res = await getPaymentProofsBySellerIdAPI(sellerId);
      setPaymentProofs(Array.isArray(res) ? res : []);
    } catch (e) { console.error('Error proofs', e); }
  };

  /* ─────────── submit final ─────────── */
  const handleFinish = async (formValues: any) => {
    setLoading(true);
    try {
      /* 1) seller */
      const resSeller = await updateSellerAPI(seller.key, {
        ...formValues,
        pago_sucursales: formValues.sucursales,
      });
      if (!resSeller?.success) {
        message.error('Error al editar vendedor');
        setLoading(false);
        return;
      }

      /* 2) ventas */
      await updateSale(salesData);
      if (deletedSales.length) await deleteSalesAPI(deletedSales);

      /* 3) ingresos */
      await updateEntry(entryData);
      if (deletedEntryData.length)
        await deleteEntryProductsAPI(deletedEntryData);

      message.success('Cambios guardados');
      onSuccess();
    } catch (e) {
      console.error(e);
      message.error('Error al guardar');
    } finally { setLoading(false); }
  };

  /* ─────────── valores para Stats ─────────── */
  const saldoPendiente = salesData.reduce((acc, sale) => {
    if (sale.deposito_realizado) return acc;
    let subtotalDeuda = 0
    if (sale.id_pedido.pagado_al_vendedor) {
      subtotalDeuda = -sale.utilidad
    } else {
      subtotalDeuda = sale.subtotal - sale.utilidad;
    }

    return acc + subtotalDeuda - sale.id_pedido.adelanto_cliente - sale.id_pedido.cargo_delivery;
  }, 0)

  const deuda = Number(seller.deuda) || 0;
  const pagoPendiente = saldoPendiente - deuda

  /* ─────────── render ─────────── */
  return (
    <div>
      <SellerHeader name={seller.nombre} />

      <StatsCards
        pagoPendiente={pagoPendiente}
        deuda={deuda}
        saldoPendiente={saldoPendiente}
      />

      <Form
        form={form}
        onFinish={handleFinish}
        layout="vertical"
        initialValues={{
          telefono: seller.telefono,
          fecha_vigencia: dayjs(seller.fecha_vigencia, 'D-M-YYYY'),
          sucursales: seller.pago_sucursales.length
            ? seller.pago_sucursales
            : [{}],
        }}
      >
        {/* Teléfono */}
        <Form.Item name="telefono" label="Teléfono">
          <InputNumber style={{ width: '25%' }} />
        </Form.Item>

        {/* Fecha de vigencia */}
        <Form.Item
          name="fecha_vigencia"
          label="Fecha final/máxima del servicio"
        >
          <DatePicker format="DD/MM/YYYY" disabled={isSeller} />
        </Form.Item>

        {/* Sucursales */}
        <Row justify="space-between" align="middle">
          <Col><h4 className="font-bold text-lg">Servicios por sucursal</h4></Col>
          <Col>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => {
                const curr = form.getFieldValue('sucursales') || [];
                form.setFieldsValue({ sucursales: [...curr, {}] });
              }}
              disabled={isSeller}
            >
              Añadir sucursal
            </Button>
          </Col>
        </Row>

        <Form.List name="sucursales">
          {(fields, { remove }) => (
            <>
              {fields.map(field => (
                <Card key={field.key} style={{ marginTop: 16 }}>
                  <BranchFields
                    field={field}
                    remove={remove}
                    sucursalOptions={sucursales}
                    form={form}
                    isSeller={isSeller}
                  />
                </Card>
              ))}
            </>
          )}
        </Form.List>

        {/* Secciones independientes */}
        <SalesSection
          initialSales={salesData}
          onSalesChange={setSalesData}
          onDeletedSalesChange={() => { }}
          onUpdateNoPagadasTotal={() => { }}
          onUpdateHistorialTotal={() => { }}
          isSeller={isSeller}
          onUpdateOneSale={handleUpdateSale}
          onDeleteOneSale={handleDeleteSale}
        />

        <EntryHistorySection
          initialEntries={entryData}
        />

        <SellerDebtTable data={sellerDebts} setRefreshKey={setRefreshKey} isSeller={isSeller} />

        <PaymentProofSection
          proofs={paymentProofs}
          sellerId={seller.key}
        />

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
