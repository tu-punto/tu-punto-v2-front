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

const ProductInfoModal = ({ visible, onClose, product }) => {
  const { user }: any = useContext(UserContext);
  const isAdmin = user?.role === 'admin';

  const { nombre_producto, precio, fecha_de_ingreso, categoria, group, features } = product;

  const [sucursals, setSucursals] = useState<IBranch[]>([]);
  const [products, setProducts] = useState([product]);
  const [entryData, setEntryData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [restockData, setRestockData] = useState([]);


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
  }, []);

  useEffect(() => {
    setProducts([product]);
    setRestockData([{
      ...product,
      stock: product.producto_sucursal.reduce((acc, prodSuc) => acc + prodSuc.cantidad_por_sucursal, 0),
      incomingQuantity: 0,
      precio: product.precio || 0
    }]);
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

      // Update stock, entries and sales API calls
      const updatePromises = [
        updateProductStockAPI(restockBodyData.filter(item => !item.deleted)),
        updateProductEntriesAPI(entryBodyData.filter(item => !item.deleted)),
        updateProductSalesAPI(salesBodyData.filter(item => !item.deleted))
      ];

      // Delete entries and sales API calls
      const deletePromises = [
        deleteProductEntriesAPI(entryBodyData.filter(item => item.deleted)),
        deleteProductSalesAPI(salesBodyData.filter(item => item.deleted))
      ];

      await Promise.all([...updatePromises, ...deletePromises]);

      onClose();
      // onSaveSuccess();
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  return (
    <Modal
      title={product.nombre_producto}
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
          {categoria.categoria || categoria}
        </Descriptions.Item>
        <Descriptions.Item label="Grupo">{group.name}</Descriptions.Item>
        <Descriptions.Item label="Stock Total">
          {product.producto_sucursal.reduce(
            (acc: number, prodSuc: any) => acc + prodSuc.cantidad_por_sucursal,
            0
          )}
        </Descriptions.Item>
      </Descriptions>

      <h4
        style={{ marginBlock: "20px" }}
        className="text-mobile-base xl:text-desktop-base font-bold"
      >
        Stock por sucursal
      </h4>

      <Descriptions bordered layout="horizontal" column={{ xs: 1, xl: 2 }}>
        {product.producto_sucursal.map((prodSuc: any, index: number) => {
          const sucursal = sucursals.find(
            (s) => s.id_sucursal === prodSuc.id_sucursal
          );
          return (
            <Descriptions.Item
              key={index}
              label={`Stock en el ${sucursal ? sucursal.nombre : "Sucursal desconocida"
                }`}
            >
              {prodSuc.cantidad_por_sucursal}
            </Descriptions.Item>
          );
        })}
      </Descriptions>

      <h3
        style={{ marginTop: "20px" }}
        className="text-mobile-sm xl:text-desktop-sm"
      >
        Características
      </h3>
      <Descriptions bordered layout="horizontal" column={{ xs: 1, lg: 2 }}>
        {features.map((feature, index) => (
          <Descriptions.Item key={index} label={feature.feature}>
            {feature.value}
          </Descriptions.Item>
        ))}
      </Descriptions>
      <RestockTable
        products={products}
        onSave={handleSave}
        setRestockData={setRestockData}
      />
      <h3
        style={{ marginTop: "20px" }}
        className="text-mobile-sm xl:text-desktop-sm"
      >
        Historial de Ingresos
      </h3>
      <EntryProductTable
        product={products}
        onSave={handleSave}
        setEntryData={setEntryData}
      />
      <h3
        style={{ marginTop: "20px" }}
        className="text-mobile-sm xl:text-desktop-sm"
      >
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
