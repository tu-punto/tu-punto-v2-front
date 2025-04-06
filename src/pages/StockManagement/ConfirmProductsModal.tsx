import { Modal, Button, Descriptions, Table, Input, Popconfirm, InputNumber, Space } from 'antd';
import { createProductsFromGroup, createVariant, getProductsFromGroup } from '../../services/createProducts';
import { updateProductStockAPI } from '../../api/product';
import { generateDeliveredProductsAPI } from '../../api/googleDrive';
import { useEffect, useMemo, useState } from 'react';


const ConfirmProductsModal = ({ visible, onClose, onSuccess, newVariants, newProducts, newStock }) => {

  const [stockData, setStockData] = useState(newStock);
  const [variantData, setVariantData] = useState(newVariants);
  const [productData, setProductData] = useState(newProducts)

  const saveProducts = async () => {
        
    for(const variant of variantData){
        await createVariant(variant)
    }

    for(const product of productData){
        const {productData, combinations, selectedFeatures, features} = product
        await createProductsFromGroup(productData, combinations, selectedFeatures, features)
    }

    const newStockList = stockData.map(stock => stock.newStock)
    
    await updateProductStockAPI(newStockList)

    // Process newProducts
    const productsArray = productData.flatMap((product) =>
      product.combinations.map((combination) => ({
        producto: `${product.productData.nombre_producto} - ${Object.entries(combination)
          .filter(([key]) => !["key", "price", "stock"].includes(key))
          .map(([_, value]) => value)
          .join(", ")}`, // Combine name and features
        unitario: combination.price,
        cantidad: combination.stock,
        total: combination.price * combination.stock,
      }))
    );

    // Process newStock
    const stockArray = stockData.map((stockEntry) => ({
      producto: stockEntry.product.nombre_producto, // Product name
      unitario: stockEntry.product.precio, // Price
      cantidad: stockEntry.newStock.stock, // Stock
      total: stockEntry.product.precio * stockEntry.newStock.stock, // Total
    }));

    // Process newVariants
    const variantsArray = variantData.map((variant) => ({
      producto: variant.product.nombre_producto, // Product name
      unitario: variant.product.precio, // Price
      cantidad: variant.product.stock, // Stock
      total: variant.product.precio * variant.product.stock, // Total
    }));

    // Merge all arrays into one
    const productsPDF = [...productsArray, ...stockArray, ...variantsArray];

    await generateDeliveredProductsAPI(productsPDF)
    
    onSuccess()
}

  const handleEdit = (record, key, value) => {
    const updatedData = stockData.map((item) =>
      item === record ? { ...item, [key]: value } : item
    );
    setStockData(updatedData); // Update state
  };

  const handleDelete = (data, setData, record) => {
    const updatedData = data.filter((item) => item !== record);
    setData(updatedData); // Update state
  };

  const handleEditVariant = (record, keyPath, value) => {
    const updatedData = variantData.map((item) => {
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
    const updatedProducts = productData.map((product) => {
      if (product === record.originalProduct) {
        const updatedCombinations = product.combinations.map((combination) =>
          combination.key === record.combinationKey
            ? { ...combination, [key]: value }
            : combination
        );
        return { ...product, combinations: updatedCombinations };
      }
      return product;
    });
    console.log("Updated Products")
    setProductData(updatedProducts); // Update state
  };
  
  
  const flattenedCombinations = useMemo(
    () =>
      productData.flatMap((product) =>
        product.combinations.map((combination) => ({
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

  const stockColumns = [
    {
      title: "Product Name",
      dataIndex: ["product", "nombre_producto"], // Access nested data
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
          onChange={(value) => handleEdit(record, "newStock", { ...record.newStock, stock: value })}
        />
      ),
    },
    {
      title: "Price",
      dataIndex: ["product", "precio"], // Access price directly
      key: "precio",
    },
    {
      title: "Actions",
      key: "actions",
      render: (text, record) => (
        <Popconfirm
          title="Are you sure you want to delete this item?"
          onConfirm={() => handleDelete(stockData, setStockData, record)}
        >
          <Button danger>Delete</Button>
        </Popconfirm>
      ),
    },
  ];
  const variantColumns = [
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
          onChange={(value) =>
            handleEditVariant(
              record,
              ["product", "stock"],
              value
            )
          }
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
          onChange={(value) =>
            handleEditVariant(
              record,
              ["product", "precio"],
              value
            )
          }
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (text, record) => (
        <Popconfirm
          title="Are you sure you want to delete this variant?"
          onConfirm={() => handleDelete(variantData, setVariantData, record)}
        >
          <Button danger>Delete</Button>
        </Popconfirm>
      ),
    },
  ];

  const productColumns = [
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
        <InputNumber
          min={0}
          value={stock}
          onChange={(value) => handleEditProducts(record, "stock", value)}
        />
      ),
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      render: (price, record) => (
        <InputNumber
          min={0}
          step={0.01}
          value={price}
          onChange={(value) => handleEditProducts(record, "price", value)}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Popconfirm
          title="Are you sure you want to delete this combination?"
          onConfirm={() => {
            const updatedProducts = productData.map((product) => {
              if (product === record.originalProduct) {
                const updatedCombinations = product.combinations.filter(
                  (comb) => comb.key !== record.combinationKey
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
  ];
  
  

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
            console.log("Final Stock Data:", {stockData, variantData, productData})
            saveProducts()
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
        columns={stockColumns}
        rowKey={(record) => record.product.id_producto} // Unique key for each row
        pagination={false}
      />

      <h3>New Variants</h3>
      <Table
        dataSource={variantData}
        columns={variantColumns}
        rowKey={(record) => `${record.product.nombre_producto}_${record.product.groupId}`} // Use a unique key
        pagination={false}
      />

      <Table
        dataSource={flattenedCombinations}
        columns={productColumns}
        rowKey="key"
        pagination={false}
      />

    </Modal>
  );

};

export default ConfirmProductsModal;
 

