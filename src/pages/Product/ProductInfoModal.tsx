/*
import { Modal, Button, Descriptions, message } from 'antd';
import RestockTable from './RestockTable';
import EntryProductTable from './EntryProductTable';
import SalesProductTable from './SalesProductTable';
import { useContext, useEffect, useState } from 'react';
import { deleteProductSalesAPI, updateProductSalesAPI } from '../../api/sales';
import { updateProductEntriesAPI, deleteProductEntriesAPI } from '../../api/entry';
import { updateProductStockAPI } from '../../api/product';
import { UserContext } from '../../context/userContext';
import { IBranch } from '../../models/branchModel';
import { getSucursalsAPI } from '../../api/sucursal';

interface Product {
  _id?: string;
  id_producto?: number;
  nombre_producto: string;
  precio: number;
  fecha_de_ingreso: Date | string;
  categoria: { categoria: string } | string;
  group: { name: string; nombre?: string } | string; // Added nombre for compatibility
  features: Array<{ feature: string; value: string }>;
  producto_sucursal: Array<{
    id_sucursal: number;
    cantidad_por_sucursal: number;
  }>;
  [key: string]: any; // For additional dynamic properties
}

interface ProductInfoModalProps {
  visible: boolean;
  onClose: () => void;
  product: Product | null;
}

const ProductInfoModal = ({ visible, onClose, product }: ProductInfoModalProps) => {
  const { user }: any = useContext(UserContext);
  const isAdmin = user?.role === 'admin';

  const [sucursals, setSucursals] = useState<IBranch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [entryData, setEntryData] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [restockData, setRestockData] = useState<any[]>([]);

  // Early return if no product
  if (!product) return null;

  // Destructure with defaults
  const {
    nombre_producto = "Sin nombre",
    precio = 0,
    fecha_de_ingreso = new Date().toISOString(),
    categoria = { categoria: "Sin categoría" },
    group = { name: "Sin grupo", nombre: "Sin grupo" },
    features = [],
    producto_sucursal = []
  } = product;

  const fetchSucursals = async () => {
    try {
      const response = await getSucursalsAPI();
      setSucursals(response);
    } catch (error) {
      message.error("Error al obtener las sucursales");
    }
  };

  useEffect(() => {
    fetchSucursals();
    if (product) {
      setProducts([product]);
      setRestockData([{
        ...product,
        stock: producto_sucursal.reduce((acc, prodSuc) => acc + prodSuc.cantidad_por_sucursal, 0),
        incomingQuantity: 0,
        precio: product.precio || 0
      }]);
    }
  }, [product]);

  const handleSave = async () => {
    try {
      const restockBodyData = restockData.map(({ incomingQuantity, precio, id_producto, deleted }) => ({
        precio,
        stock: incomingQuantity,
        productId: id_producto,
        sucursalId: 3,
        deleted
      }));

      const entryBodyData = entryData.map(({ id_ingreso, cantidad_ingreso, deleted }) => ({
        id_ingreso,
        cantidad_ingreso,
        deleted
      }));

      const salesBodyData = salesData.map(({ id_venta, cantidad, precio_unitario, deleted }) => ({
        id_venta,
        cantidad,
        precio_unitario,
        deleted
      }));

      const updatePromises = [
        updateProductStockAPI(restockBodyData.filter(item => !item.deleted)),
        updateProductEntriesAPI(entryBodyData.filter(item => !item.deleted)),
        updateProductSalesAPI(salesBodyData.filter(item => !item.deleted))
      ];

      const deletePromises = [
        deleteProductEntriesAPI(entryBodyData.filter(item => item.deleted)),
        deleteProductSalesAPI(salesBodyData.filter(item => item.deleted))
      ];

      await Promise.all([...updatePromises, ...deletePromises]);
      onClose();
    } catch (error) {
      console.error('Error saving data:', error);
      message.error('Error al guardar los cambios');
    }
  };

  return (
      <Modal
          title={nombre_producto}
          open={visible}
          onCancel={onClose}
          footer={[
            <Button
                key="back"
                onClick={onClose}
                className="text-mobile-sm xl:text-desktop-sm"
            >
              Cerrar
            </Button>,
            isAdmin && (
                <Button
                    key="save"
                    type="primary"
                    onClick={handleSave}
                    className="text-mobile-sm xl:text-desktop-sm"
                >
                  Guardar
                </Button>
            ),
          ]}
          centered
          width={window.innerWidth <= 1024 ? "80%" : 800}
      >
        <Descriptions bordered layout="horizontal" column={{ xs: 1, xl: 2 }}>
          <Descriptions.Item label="Nombre">{nombre_producto}</Descriptions.Item>
          <Descriptions.Item label="Precio">{precio} Bs</Descriptions.Item>
          <Descriptions.Item label="Fecha de Ingreso">
            {new Date(fecha_de_ingreso).toLocaleDateString()}
          </Descriptions.Item>
          <Descriptions.Item label="Categoría">
            {typeof categoria === 'string' ? categoria : categoria.categoria}
          </Descriptions.Item>
          <Descriptions.Item label="Grupo">
            {typeof group === 'string' ? group : group.name || group.nombre}
          </Descriptions.Item>
          <Descriptions.Item label="Stock Total">
            {producto_sucursal.reduce((acc, prodSuc) => acc + prodSuc.cantidad_por_sucursal, 0)}
          </Descriptions.Item>
        </Descriptions>

        <h4 style={{ marginBlock: "20px" }} className="text-mobile-base xl:text-desktop-base font-bold">
          Stock por sucursal
        </h4>

        <Descriptions bordered layout="horizontal" column={{ xs: 1, xl: 2 }}>
          {producto_sucursal.map((prodSuc, index) => {
            const sucursal = sucursals.find((s) => s.id_sucursal === prodSuc.id_sucursal);
            return (
                <Descriptions.Item
                    key={index}
                    label={`Stock en ${sucursal ? sucursal.nombre : "Sucursal desconocida"}`}
                >
                  {prodSuc.cantidad_por_sucursal}
                </Descriptions.Item>
            );
          })}
        </Descriptions>

        {features.length > 0 && (
            <>
              <h3 style={{ marginTop: "20px" }} className="text-mobile-sm xl:text-desktop-sm">
                Características
              </h3>
              <Descriptions bordered layout="horizontal" column={{ xs: 1, lg: 2 }}>
                {features.map((feature, index) => (
                    <Descriptions.Item key={index} label={feature.feature}>
                      {feature.value}
                    </Descriptions.Item>
                ))}
              </Descriptions>
            </>
        )}

        <RestockTable
            products={products}
            onSave={handleSave}
            setRestockData={setRestockData}
        />

        <h3 style={{ marginTop: "20px" }} className="text-mobile-sm xl:text-desktop-sm">
          Historial de Ingresos
        </h3>
        <EntryProductTable
            product={products}
            onSave={handleSave}
            setEntryData={setEntryData}
        />

        <h3 style={{ marginTop: "20px" }} className="text-mobile-sm xl:text-desktop-sm">
          Historial de Ventas
        </h3>
        <SalesProductTable
            product={products}
            onSave={handleSave}
            setSalesData={setSalesData}
        />
      </Modal>
  );
};

export default ProductInfoModal;

 */