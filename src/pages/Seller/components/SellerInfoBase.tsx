import { Button, Col, DatePicker, Form, InputNumber, message, Row } from "antd";
import { useContext, useEffect, useState } from "react";
import dayjs from 'dayjs';
import { getProductsEntryAmount, updateEntry, deleteEntryProductsAPI } from "../../../api/entry";
import { getPaymentProofsBySellerIdAPI } from "../../../api/paymentProof";
import { getProductsBySellerIdAPI, updateSale, deleteSalesAPI } from "../../../api/sales";
import { updateSellerAPI } from "../../../api/seller";
import { getSucursalsAPI } from "../../../api/sucursal";
import { UserContext } from "../../../context/userContext";
import useEditableTable from "../../../hooks/useEditableTable";
import EntryProductSellerTable from "./EntryProductSellerTable";
import PaymentProofTable from "./PaymentProofTable";
import CustomTable from "./SalesTable";
import { getShipingByIdsAPI } from "../../../api/shipping";
import PaymentProofPDF from "../../GeneratePDF/PaymentProofPDF";

const SellerInfoPage = ({ visible, onSuccess, onCancel, seller }: any) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [products, setProducts, handleValueChange] = useEditableTable([]);
    const [entryProductsAmount, setEntryProductsAmount, handleValueChangeEntry] = useEditableTable([]);
    const [originalProducts, setOriginalProducts] = useState([]);
    const [originalEntryProducts, setOriginalEntryProducts] = useState([]);
    const [paymentProofs, setPaymentProofs] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [sucursalesLoaded, setSucursalesLoaded] = useState(false);
    const [deletedProducts, setDeletedProducts] = useState([]);
    const [deletedEntryProducts, setDeletedEntryProducts] = useState([]);
    const [deudaCalculada, setDeudaCalculada] = useState(0);
    const [totalNoPagadas, setTotalNoPagadas] = useState(0);
    const [totalHistorial, setTotalHistorial] = useState(0);

    const { user } = useContext(UserContext);
    const isSeller = user?.role === "seller";

    // Función para obtener las sucursales
    const fetchSucursales = async () => {
        try {
            const response = await getSucursalsAPI();
            setSucursales(response);
            setSucursalesLoaded(true);
        } catch (error) {
            console.log('Error fetching sucursales:', error);
        }
    };

    // Función para obtener los comprobantes de pago
    const fetchPaymentProofs = async (sellerId: number) => {
        try {
            const response = await getPaymentProofsBySellerIdAPI(sellerId);
            if (Array.isArray(response)) {
                setPaymentProofs(response);
            } else {
                console.error("Expected array but received:", response);
            }
        } catch (error) {
            console.error('Error fetching payment proofs:', error);
        }
    };
    // Función para obtener los productos
    const fetchProducts = async () => {
        try {
            const response = await getProductsBySellerIdAPI(seller.key);
            const productos = Array.isArray(response) ? response : [];
            const pedidos = response.map((product) => product.id_pedido);
            const uniquePedidos = Array.from(new Set(pedidos));

            const shippingsResponse = await getShipingByIdsAPI(uniquePedidos);
            if (shippingsResponse.success) {
                const productosConTipo = productos.map((product) => {
                    const lugarEntrega = shippingsResponse.data.find((pedido) => pedido.id_pedido === product.id_pedido)?.lugar_entrega;
                    const esVenta = sucursales.some((sucursal) => sucursal.nombre.toLowerCase() === lugarEntrega.toLowerCase());
                    return {
                        ...product,
                        tipo: esVenta ? "Venta" : "Pedido",
                        key: `${product.id_producto}-${product.fecha_pedido}`,
                    };
                });
                setProducts(productosConTipo);
                setOriginalProducts(productosConTipo);
            } else {
                console.error('Error fetching shippings:', shippingsResponse);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const handleDeleteProduct = (key: any, isEntryProduct = false) => {
        if (isEntryProduct) {
            setEntryProductsAmount((prevProducts: any) => {
                const updatedProducts = prevProducts.filter((product: any) => product.key !== key);
                const deletedProduct = prevProducts.find((product: any) => product.key === key);
                if (deletedProduct && deletedProduct.id_ingreso) {
                    setDeletedEntryProducts((prevDeleted): any => [...prevDeleted, { id_ingreso: deletedProduct.id_ingreso, id_producto: deletedProduct.id_producto }]);
                }
                return updatedProducts;
            });
        } else {
            setProducts((prevProducts: any) => {
                const updatedProducts = prevProducts.filter((product) => product.key !== key);
                const deletedProduct = prevProducts.find((product) => product.key === key);
                if (deletedProduct && deletedProduct.id_venta) {
                    setDeletedProducts((prevDeleted): any => [...prevDeleted, { id_venta: deletedProduct.id_venta, id_producto: deletedProduct.id_producto }]);
                }
                return updatedProducts;
            });
        }
    };

    // Función para obtener el monto de ingreso de productos
    const fetchEntryProductAmount = async () => {
        try {
            const response = await getProductsEntryAmount(seller.key);
            const productsWithKey = response.map((item) => ({ ...item, key: item.id_ingreso }));
            setEntryProductsAmount(productsWithKey);
            setOriginalEntryProducts(productsWithKey);
        } catch (error) {
            console.log('Error fetching products with entry amount:', error);
        }
    };

    const calcularDeuda = () => {
        const totalServicios = seller.alquiler + seller.exhibicion + seller.delivery;
        const adelantoServicio = seller.adelanto_servicio || 0;

        const startDate = dayjs(seller.fecha, "D/M/YYYY/");
        const finishDate = dayjs(seller.fecha_vigencia, "D/M/YYYY/");
        const mesesTranscurridos = finishDate.diff(startDate, 'month');

        const deuda = (totalServicios * mesesTranscurridos) - adelantoServicio;
        setDeudaCalculada(deuda);
    };

    useEffect(() => {
        if (seller.key) {
            fetchSucursales();
        }
    }, [seller]);

    useEffect(() => {
        if (sucursalesLoaded) {
            fetchProducts();
            fetchEntryProductAmount();
            fetchPaymentProofs(seller.key);
            calcularDeuda();
        }
    }, [sucursalesLoaded]);

    const handleFinish = async (sellerData: any) => {
        setLoading(true);
        try {
            console.log("Submitting form with sellerData", sellerData);
            const resSeller = await updateSellerAPI(parseInt(seller.key), sellerData);
            if (!resSeller?.success) {
                message.error('Error al editar el vendedor');
                return;
            }

            await updateSale(products);
            await updateEntry(entryProductsAmount);

            // Elimina productos
            if (deletedProducts.length > 0) {
                await deleteSalesAPI(deletedProducts);
            }

            // Elimina ingreso de productos
            if (deletedEntryProducts.length > 0) {
                await deleteEntryProductsAPI(deletedEntryProducts);
            }

            message.success('Vendedor editado con éxito');
            onSuccess();
        } catch (error) {
            console.error('Error updating seller:', error);
            message.error('Error al actualizar el vendedor');
        } finally {
            setLoading(false);
        }
    };

    const ventasNoPagadasProductos = products.filter((product) => product.deposito_realizado === false);

    return (
        <div>
            <h2 className="text-mobile-sm xl:text-desktop-sm">Información del Vendedor: {seller.nombre}</h2>

            <div className="flex flex-col xl:flex-row justify-between mb-4">
                <div style={{ background: '#007bff', color: '#fff', padding: '16px', borderRadius: '8px', textAlign: 'center', margin: '4px' }} className="w-full xl:w-3/6">
                    <h3 className="text-mobile-sm xl:text-desktop-sm">PAGO PENDIENTE</h3>
                    <h2 className="text-mobile-sm xl:text-desktop-sm">{`${seller.deuda}`}</h2>
                </div>
                <div style={{ background: '#1976d2', color: '#fff', padding: '16px', borderRadius: '8px', textAlign: 'center', margin: '4px' }} className="w-full xl:w-3/6">
                    <h3 className="text-mobile-sm xl:text-desktop-sm">Deuda no pagado</h3>
                    <h2 className="text-mobile-sm xl:text-desktop-sm">{`Bs. ${deudaCalculada}`}</h2>
                </div>
                <div style={{ background: '#1976d2', color: '#fff', padding: '16px', borderRadius: '8px', textAlign: 'center', margin: '4px' }} className="w-full xl:w-3/6">
                    <h3 className="text-mobile-sm xl:text-desktop-sm">Saldo Pendiente</h3>
                    <h2 className="text-mobile-sm xl:text-desktop-sm">{`Bs. ${seller.deudaInt - deudaCalculada}`}</h2>
                </div>
            </div>

            <Form
                form={form}
                onFinish={handleFinish}
                layout="vertical"
                initialValues={{
                    telefono: seller.telefono,
                    fecha_vigencia: dayjs(seller.fecha_vigencia, "D/M/YYYY"),
                    alquiler: seller.alquiler,
                    exhibicion: seller.exhibicion,
                    delivery: seller.delivery,
                    adelanto_servicio: seller.adelanto_servicio,
                    fecha: dayjs(seller.fecha, "D/M/YYYY"),
                }}
            >
                <Form.Item name="telefono" label='Teléfono'>
                    <InputNumber style={{ width: '25%' }} />
                </Form.Item>
                <Form.Item name="fecha_vigencia" label='Fecha final/máxima del servicio'>
                    <DatePicker format="DD/MM/YYYY" disabled={isSeller} />
                </Form.Item>
                <Row gutter={16}>
                    <Col sm={24} xl={8}>
                        <Form.Item name="alquiler" label="Alquiler">
                            <InputNumber className="w-full" prefix="Bs." min={0} readOnly={isSeller} />
                        </Form.Item>
                    </Col>
                    <Col sm={24} xl={8}>
                        <Form.Item name="exhibicion" label="Exhibición">
                            <InputNumber className="w-full" prefix="Bs." min={0} readOnly={isSeller} />
                        </Form.Item>
                    </Col>
                    <Col sm={24} xl={8}>
                        <Form.Item name="delivery" label="Delivery">
                            <InputNumber className="w-full" prefix="Bs." min={0} readOnly={isSeller} />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item name="adelanto_servicio" label="Adelanto">
                    <InputNumber className="w-full" prefix="Bs." min={0} readOnly={isSeller} />
                </Form.Item>
                <Form.Item name="fecha" label='Fecha de Inicio'>
                    <DatePicker format="DD/MM/YYYY" disabled={isSeller} />
                </Form.Item>

                <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                    <h4 style={{ fontWeight: 'bold', fontSize: 20 }} className="text-mobile-sm xl:text-desktop-sm">Ventas no pagadas</h4>
                    <CustomTable
                        data={ventasNoPagadasProductos}
                        onUpdateTotalAmount={setTotalNoPagadas}
                        onDeleteProduct={handleDeleteProduct}
                        handleValueChange={handleValueChange}
                        showClient={true}
                        isAdmin={!isSeller}
                    />
                </div>

                <PaymentProofPDF
                    sellerId={seller.key}
                />

                <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                    <h4 style={{ fontWeight: 'bold', fontSize: 20 }} className="text-mobile-sm xl:text-desktop-sm">Historial de ventas</h4>
                    <CustomTable
                        data={products}
                        onUpdateTotalAmount={setTotalHistorial}
                        onDeleteProduct={handleDeleteProduct}
                        handleValueChange={handleValueChange}
                        showClient={false}
                        isAdmin={!isSeller}
                    />
                </div>
                <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                    <h4 style={{ fontWeight: 'bold', fontSize: 20 }} className="text-mobile-sm xl:text-desktop-sm">Historial de ingreso</h4>
                    <EntryProductSellerTable
                        data={entryProductsAmount}
                        handleValueChange={handleValueChangeEntry}
                        onDeleteProduct={handleDeleteProduct}
                        isAdmin={!isSeller}
                    />
                </div>
                <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                    <h4 style={{ fontWeight: 'bold', fontSize: 20 }} className="text-mobile-sm xl:text-desktop-sm">Comprobante de pago</h4>
                    <PaymentProofTable
                        data={paymentProofs}
                    />
                </div>

                <Form.Item>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Form.Item style={{ margin: 0 }}>
                            <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: '8px' }} className="text-mobile-sm xl:text-desktop-sm">
                                {loading ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </Form.Item>
                        {!isSeller && (
                            <Form.Item style={{ margin: 0 }}>
                                <Button onClick={onCancel} className="text-mobile-sm xl:text-desktop-sm">
                                    Cancelar
                                </Button>
                            </Form.Item>
                        )}
                    </div>
                </Form.Item>
            </Form>
        </div>
    );
};

export default SellerInfoPage;