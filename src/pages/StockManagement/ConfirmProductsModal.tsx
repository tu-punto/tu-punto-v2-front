import { Modal, Button, Table, InputNumber, Popconfirm } from 'antd';
// 🔧 Estas importaciones son de las APIs reales, puedes comentar si no las usarás
// import { createProductsFromGroup, createVariant } from '../../services/createProducts';
// import { updateProductStockAPI } from '../../api/product';
// import { generateDeliveredProductsAPI } from '../../api/googleDrive';
import { useEffect, useMemo, useState } from 'react';

const ConfirmProductsModal = ({ visible, onClose, onSuccess }) => {
  // 🧪 Datos quemados para pruebas:
  const [stockData, setStockData] = useState([
    {
      product: {
        id_producto: 1,
        nombre_producto: 'Azúcar Blanca',
        precio: 5,
      },
      newStock: {
        stock: 100,
      },
    },
  ]);

  const [variantData, setVariantData] = useState([
    {
      product: {
        id_producto: 2,
        nombre_producto: 'Harina Integral',
        precio: 4.5,
        stock: 50,
        categoria: { categoria: 'Alimentos' },
        groupId: 'grupo-1',
      },
    },
  ]);

  const [productData, setProductData] = useState([
    {
      productData: {
        nombre_producto: 'Leche Entera',
      },
      combinations: [
        {
          key: 'leche1',
          tamaño: '1L',
          stock: 20,
          price: 6,
        },
        {
          key: 'leche2',
          tamaño: '2L',
          stock: 10,
          price: 10,
        },
      ],
      selectedFeatures: ['tamaño'],
      features: ['tamaño'],
    },
  ]);

  const saveProducts = async () => {
    console.log("🔄 Iniciando proceso de guardado...");

    try {
      // 🔧 Aquí se llamarían las APIs para crear variantes
      for (const variant of variantData) {
        console.log("➡️ Crear variant:", variant);
        // await createVariant(variant);
      }

      // 🔧 Crear productos con combinaciones
      for (const product of productData) {
        console.log("➡️ Crear producto con combinaciones:", product);
        // await createProductsFromGroup(product.productData, product.combinations, product.selectedFeatures, product.features);
      }

      // 🔧 Actualizar stock
      const newStockList = stockData.map(stock => stock.newStock);
      console.log("📈 Actualizar stock:", newStockList);
      // await updateProductStockAPI(newStockList);

      // 🔧 Preparar PDF (simulado)
      const productsArray = productData.flatMap(product =>
          product.combinations.map(comb => ({
            producto: `${product.productData.nombre_producto} - ${comb.tamaño}`,
            unitario: comb.price,
            cantidad: comb.stock,
            total: comb.price * comb.stock,
          }))
      );

      const stockArray = stockData.map(stockEntry => ({
        producto: stockEntry.product.nombre_producto,
        unitario: stockEntry.product.precio,
        cantidad: stockEntry.newStock.stock,
        total: stockEntry.product.precio * stockEntry.newStock.stock,
      }));

      const variantsArray = variantData.map(variant => ({
        producto: variant.product.nombre_producto,
        unitario: variant.product.precio,
        cantidad: variant.product.stock,
        total: variant.product.precio * variant.product.stock,
      }));

      const productsPDF = [...productsArray, ...stockArray, ...variantsArray];

      console.log("🧾 Generar PDF con los siguientes productos:");
      console.table(productsPDF);

      // await generateDeliveredProductsAPI(productsPDF);

      console.log("✅ Proceso simulado exitosamente");
      onSuccess?.();
    } catch (error) {
      console.error("❌ Error al guardar productos:", error);
    }
  };

  const handleEdit = (record, key, value) => {
    const updatedData = stockData.map(item =>
        item === record ? { ...item, [key]: value } : item
    );
    setStockData(updatedData);
  };

  const handleDelete = (data, setData, record) => {
    const updatedData = data.filter(item => item !== record);
    setData(updatedData);
  };

  const handleEditVariant = (record, keyPath, value) => {
    const updatedData = variantData.map(item => {
      if (item === record) {
        const updatedItem = { ...item };
        let nestedField = updatedItem;
        for (let i = 0; i < keyPath.length - 1; i++) {
          nestedField = nestedField[keyPath[i]];
        }
        nestedField[keyPath[keyPath.length - 1]] = value;
        return updatedItem;
      }
      return item;
    });
    setVariantData(updatedData);
  };

  const handleEditProducts = (record, key, value) => {
    const updatedProducts = productData.map(product => {
      if (product === record.originalProduct) {
        const updatedCombinations = product.combinations.map(comb =>
            comb.key === record.combinationKey ? { ...comb, [key]: value } : comb
        );
        return { ...product, combinations: updatedCombinations };
      }
      return product;
    });
    setProductData(updatedProducts);
  };

  const flattenedCombinations = useMemo(
      () =>
          productData.flatMap(product =>
              product.combinations.map(combination => ({
                key: combination.key,
                productName: product.productData.nombre_producto,
                variant: Object.entries(combination)
                    .filter(([key]) => !["key", "stock", "price"].includes(key))
                    .map(([_, value]) => value)
                    .join(", "),
                stock: combination.stock,
                price: combination.price,
                originalProduct: product,
                combinationKey: combination.key,
              }))
          ),
      [productData]
  );

  return (
      <Modal
          title="Confirm Changes"
          visible={visible}
          onCancel={onClose}
          footer={[
            <Button key="cancel" onClick={onClose}>
              Cancel
            </Button>,
            <Button
                key="submit"
                type="primary"
                onClick={() => {
                  console.log("📋 Datos antes de guardar:", { stockData, variantData, productData });
                  saveProducts();
                }}
            >
              Confirm
            </Button>,
          ]}
          width={800}
      >
        <h3>New Stock</h3>
        <Table
            dataSource={stockData}
            columns={[
              {
                title: "Product Name",
                dataIndex: ["product", "nombre_producto"],
                key: "nombre_producto",
              },
              {
                title: "Stock",
                dataIndex: "stock",
                key: "stock",
                render: (text, record) => (
                    <InputNumber
                        min={0}
                        value={record.newStock.stock}
                        onChange={value => handleEdit(record, "newStock", { ...record.newStock, stock: value })}
                    />
                ),
              },
              {
                title: "Price",
                dataIndex: ["product", "precio"],
                key: "precio",
              },
              {
                title: "Actions",
                key: "actions",
                render: (_, record) => (
                    <Popconfirm title="Delete?" onConfirm={() => handleDelete(stockData, setStockData, record)}>
                      <Button danger>Delete</Button>
                    </Popconfirm>
                ),
              },
            ]}
            rowKey={record => record.product.id_producto}
            pagination={false}
        />

        <h3>New Variants</h3>
        <Table
            dataSource={variantData}
            columns={[
              {
                title: "Product Name",
                dataIndex: ["product", "nombre_producto"],
                key: "nombre_producto",
              },
              {
                title: "Category",
                dataIndex: ["product", "categoria", "categoria"],
                key: "categoria",
              },
              {
                title: "Stock",
                dataIndex: ["product", "stock"],
                key: "stock",
                render: (text, record) => (
                    <InputNumber
                        min={0}
                        value={record.product.stock}
                        onChange={value => handleEditVariant(record, ["product", "stock"], value)}
                    />
                ),
              },
              {
                title: "Price",
                dataIndex: ["product", "precio"],
                key: "precio",
                render: (text, record) => (
                    <InputNumber
                        min={0}
                        step={0.01}
                        value={record.product.precio}
                        onChange={value => handleEditVariant(record, ["product", "precio"], value)}
                    />
                ),
              },
              {
                title: "Actions",
                key: "actions",
                render: (_, record) => (
                    <Popconfirm title="Delete?" onConfirm={() => handleDelete(variantData, setVariantData, record)}>
                      <Button danger>Delete</Button>
                    </Popconfirm>
                ),
              },
            ]}
            rowKey={record => `${record.product.nombre_producto}_${record.product.groupId}`}
            pagination={false}
        />

        <h3>New Products</h3>
        <Table
            dataSource={flattenedCombinations}
            columns={[
              {
                title: "Product Name",
                dataIndex: "productName",
                key: "productName",
              },
              {
                title: "Variant",
                dataIndex: "variant",
                key: "variant",
              },
              {
                title: "Stock",
                dataIndex: "stock",
                key: "stock",
                render: (stock, record) => (
                    <InputNumber min={0} value={stock} onChange={value => handleEditProducts(record, "stock", value)} />
                ),
              },
              {
                title: "Price",
                dataIndex: "price",
                key: "price",
                render: (price, record) => (
                    <InputNumber min={0} step={0.01} value={price} onChange={value => handleEditProducts(record, "price", value)} />
                ),
              },
              {
                title: "Actions",
                key: "actions",
                render: (_, record) => (
                    <Popconfirm
                        title="Delete combination?"
                        onConfirm={() => {
                          const updatedProducts = productData.map(product => {
                            if (product === record.originalProduct) {
                              const updatedCombinations = product.combinations.filter(
                                  comb => comb.key !== record.combinationKey
                              );
                              return { ...product, combinations: updatedCombinations };
                            }
                            return product;
                          });
                          setProductData(updatedProducts);
                        }}
                    >
                      <Button danger>Delete</Button>
                    </Popconfirm>
                ),
              },
            ]}
            rowKey="key"
            pagination={false}
        />
      </Modal>
  );
};

export default ConfirmProductsModal;
