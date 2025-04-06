import { Button, Col, DatePicker, Form, Input, InputNumber, message, Modal, Row } from "antd";
import { useContext, useEffect, useState } from "react";
import dayjs from 'dayjs';
import CustomTable from "./components/SalesTable";
import { deleteSalesAPI, getProductsBySellerIdAPI, updateSale } from "../../api/sales";
import { getShipingByIdsAPI } from "../../api/shipping";
import { updateSellerAPI } from "../../api/seller";
import { getSucursalsAPI } from "../../api/sucursal";
import useEditableTable from "../../hooks/useEditableTable";
import PaymentProofTable from "./components/PaymentProofTable";
import { getPaymentProofsBySellerIdAPI } from "../../api/paymentProof";
import { deleteEntryProductsAPI, getProductsEntryAmount, updateEntry } from "../../api/entry";
import EntryProductSellerTable from "./components/EntryProductSellerTable";
import { UserContext } from "../../context/userContext";

const SellerInfoModal = ({ visible, onSuccess, onCancel, seller }: any) => {

    const [loading, setLoading] = useState(false);
    const [products, setProducts, handleValueChange] = useEditableTable([])
    const [entryProductsAmount, setEntryProductsAmount, handleValueChangeEntry] = useEditableTable([]);
    const [originalProducts, setOriginalProducts] = useState<any[]>([]);
    const [originalEntryProducts, setOriginalEntryProducts] = useState<any[]>([]);
    const [paymentProofs, setPaymentProofs] = useState<any[]>([]);
    const [totalAdelantoCliente, setTotalAdelantoCliente] = useState(0);
    const [totalNoPagadas, setTotalNoPagadas] = useState(0);
    const [totalHistorial, setTotalHistorial] = useState(0);
    const [deudaCalculada, setDeudaCalculada] = useState(0);
    const [sucursales, setSucursales] = useState<any[]>([]);
    const [deletedProducts, setDeletedProducts] = useState<any[]>([]);
    const [deletedEntryProducts, setDeletedEntryProducts] = useState<any[]>([]);
    const [sucursalesLoaded, setSucursalesLoaded] = useState(false);

    const { user } = useContext(UserContext);
    const isSeller = user?.role === "seller";
    // console.log(user, "esss el user")

    const fetchSucursales = async () => {
        try {
            const response = await getSucursalsAPI();
            setSucursales(response);
            setSucursalesLoaded(true);
        } catch (error) {
            console.log('Error fetching sucursales:', error)
        }
    }
    // console.log(paymentProofs)
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
    const fetchProducts = async () => {
        try {
            const response = await getProductsBySellerIdAPI(seller.key);
            const productos = Array.isArray(response) ? response : [];

            const pedidos = response.map((product: any) => product.id_pedido);
            const uniquePedidos = Array.from(new Set<number>(pedidos));
            console.log(productos)
            const shippingsResponse = await getShipingByIdsAPI(uniquePedidos);
            if (shippingsResponse.success) {
                const totalAdelanto = shippingsResponse.data.reduce((total: number, pedido: any) => {
                    return total + (pedido.adelanto_cliente || 0);
                }, 0);
                setTotalAdelantoCliente(totalAdelanto);
                const productosConTipo = productos.map((product: any) => {
                    const lugarEntrega = shippingsResponse.data.find((pedido: any) => pedido.id_pedido === product.id_pedido)?.lugar_entrega;
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
    const handleDeleteProduct = (key: any, isEntryProduct: boolean = false) => {
        if (isEntryProduct) {
            setEntryProductsAmount((prevProducts: any[]) => {
                const updatedProducts = prevProducts.filter((product: any) => product.key !== key);
                const deletedProduct = prevProducts.find((product: any) => product.key === key);
                if (deletedProduct && deletedProduct.id_ingreso) {
                    setDeletedEntryProducts((prevDeleted: any[]) => [...prevDeleted, {
                        id_ingreso: deletedProduct.id_ingreso,
                        id_producto: deletedProduct.id_producto
                    }]);
                }
                return updatedProducts;
            });

        } else {
            setProducts((prevProducts: any) => {
                const updatedProducts = prevProducts.filter((product: any) => product.key !== key);
                const deletedProduct = prevProducts.find((product: any) => product.key === key);
                if (deletedProduct && deletedProduct.id_venta) {
                    setDeletedProducts((prevDeleted: any) => [...prevDeleted,
                    {
                        id_venta: deletedProduct.id_venta,
                        id_producto: deletedProduct.id_producto
                    }
                    ]);
                }
                return updatedProducts;
            });
        }
    };

    const fetchEntryProductAmount = async () => {
        try {
            const response = await getProductsEntryAmount(seller.key);
            const productsWithKey = response.map((item: any) => ({
                ...item,
                key: item.id_ingreso,
            }));
            setEntryProductsAmount(productsWithKey)
            setOriginalEntryProducts(productsWithKey)
        } catch (error) {
            console.log('Error fetching products with entry amount:', error)
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
    // console.log(originalEntryProducts + "ES el original")
    // console.log(entryProductsAmount)
    console.log(products)
    const handleFinish = async (sellerInfo: any) => {
        setLoading(true)
        const resSeller = await updateSellerAPI(parseInt(seller.key), sellerInfo)
        if (!resSeller?.success) {
            message.error('Error al editar el vendedor');
            setLoading(false);
            return;
        }
        // console.log('Seller Info:', sellerInfo);
        // console.log('Products:', products);
        // console.log('Entry Products Amount:', entryProductsAmount);
        await updateSale(products)
        await updateEntry(entryProductsAmount)
        // Elimina productos
        if (deletedProducts.length > 0) {
            await deleteSalesAPI(deletedProducts);
        }

        // Elimina ingreso de productos
        if (deletedEntryProducts.length > 0) {
            await deleteEntryProductsAPI(deletedEntryProducts);
        }


        message.success('Vendedor editado con éxito')
        onSuccess()
        setLoading(false)
    }
    const ventasNoPagadasProductos = products.filter((product: any) => product.deposito_realizado === false);
    return (
        <Modal
            title={`Información Vendedor: ${seller.nombre}`}
            open={visible}
            footer={null}
            width={800}
            onCancel={onCancel}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ background: '#007bff', color: '#fff', padding: '16px', borderRadius: '8px', textAlign: 'center', width: '48%', margin: '4px' }}>
                    <h3 className="text-mobile-sm xl:text-desktop-sm">PAGO PENDIENTE</h3>
                    <h2 className="text-mobile-sm xl:text-desktop-sm">{`${seller.deuda}`}</h2>
                </div>
                <div style={{ background: '#1976d2', color: '#fff', padding: '16px', borderRadius: '8px', textAlign: 'center', width: '48%', margin: '4px' }}>
                    <h3 className="text-mobile-sm xl:text-desktop-sm">Deuda no pagado</h3>
                    <h2 className="text-mobile-sm xl:text-desktop-sm">{`Bs. ${deudaCalculada}`}</h2>
                </div>
                <div style={{ background: '#1976d2', color: '#fff', padding: '16px', borderRadius: '8px', textAlign: 'center', width: '48%', margin: '4px' }}>
                    <h3 className="text-mobile-sm xl:text-desktop-sm">Saldo Pendiente</h3>
                    <h2 className="text-mobile-sm xl:text-desktop-sm">{`Bs. ${seller.deudaInt - deudaCalculada}`}</h2>
                </div>
            </div>
            <Form onFinish={handleFinish} layout="vertical">
                <Form.Item
                    name="telefono"
                    label='Teléfono'
                    initialValue={seller.telefono}
                >
                    <InputNumber style={{ width: '25%' }} readOnly={isSeller} />
                </Form.Item>
                <Form.Item
                    name="fecha_vigencia"
                    label='Fecha final/máxima del servicio'
                >
                    <DatePicker
                        defaultValue={(dayjs(seller.fecha_vigencia, "D/M/YYYY/"))}
                        format="DD/MM/YYYY"
                        disabled={isSeller} />
                </Form.Item>
                <Row gutter={16}>
                    <Col span={6}>
                        <Form.Item
                            name="alquiler"
                            label="Alquiler"
                            initialValue={seller.alquiler}
                        >
                            <InputNumber className="w-full" prefix="Bs." min={0} readOnly={isSeller} />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item
                            name="exhibicion"
                            label="Exhibición"
                            initialValue={seller.exhibicion}
                        >
                            <InputNumber className="w-full" prefix="Bs." min={0} readOnly={isSeller} />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item
                            name="delivery"
                            label="Delivery"
                            initialValue={seller.delivery}
                        >
                            <InputNumber className="w-full" prefix="Bs." min={0} readOnly={isSeller} />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item
                    name="mail"
                    label='Mail'
                    initialValue={seller.mail}
                >
                    <Input style={{ width: '50%' }} readOnly={isSeller} />
                </Form.Item>
                <Form.Item
                    name="fecha"
                    label='Fecha'
                >
                    <DatePicker
                        defaultValue={(dayjs(seller.fecha, "D/M/YYYY/"))}
                        format="DD/MM/YYYY"
                        readOnly={isSeller} />
                </Form.Item>
                <Form.Item
                    name="carnet"
                    label='Carnet'
                    initialValue={seller.carnet}
                >
                    <InputNumber style={{ width: '25%' }} readOnly={isSeller} />
                </Form.Item>
                <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                    <h4 style={{ fontWeight: 'bold', fontSize: 20 }}>Ventas no pagadas</h4>
                    <CustomTable
                        data={ventasNoPagadasProductos}
                        onUpdateTotalAmount={setTotalNoPagadas}
                        onDeleteProduct={handleDeleteProduct}
                        // onUpdateTotalAmount={}
                        handleValueChange={handleValueChange}
                        showClient={true}
                        isAdmin={!isSeller}
                    />
                </div>
                <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                    <h4 style={{ fontWeight: 'bold', fontSize: 20 }}>Historial de ventas</h4>
                    <CustomTable
                        data={products}
                        onUpdateTotalAmount={setTotalHistorial}
                        onDeleteProduct={handleDeleteProduct}
                        // onUpdateTotalAmount={}
                        handleValueChange={handleValueChange}
                        showClient={false}
                        isAdmin={!isSeller}

                    />
                </div>
                <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                    <h4 style={{ fontWeight: 'bold', fontSize: 20 }}>Historial de ingreso</h4>
                    <EntryProductSellerTable
                        data={entryProductsAmount}
                        handleValueChange={handleValueChangeEntry}
                        onDeleteProduct={handleDeleteProduct}
                        isAdmin={!isSeller}
                    />
                </div>
                <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                    <h4 style={{ fontWeight: 'bold', fontSize: 20 }}>Comprobante de pago</h4>
                    <PaymentProofTable
                        data={paymentProofs}
                    />
                </div>
                {!isSeller && (
                    <Form.Item>
                        <Button type='primary' htmlType='submit' loading={loading} className="text-mobile-sm xl:text-desktop-sm">
                            Guardar
                        </Button>
                    </Form.Item>
                )}
            </Form>

        </Modal>
    );
};
export default SellerInfoModal
