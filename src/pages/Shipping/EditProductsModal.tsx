import { Modal, Button, Select, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import EmptySalesTable from "../Sales/EmptySalesTable";
import ProductSellerViewModal from "../Seller/ProductSellerViewModal.tsx";
import { deleteProductsByShippingAPI, updateProductsByShippingAPI } from "../../api/sales";
import { registerSalesToShippingAPI } from "../../api/shipping";
import { registerProductAPI } from "../../api/product.ts";

interface EditProductsModalProps {
  visible: boolean;
  onCancel: () => void;
  products: any[];
  setProducts: (updater: any) => void;
  allProducts: any[];
  sellers: any[];
  isAdmin?: boolean;
  shippingId: string;
  sucursalId: string | null;
  onSave: () => void;
  allowAddProducts?: boolean;
}

const EditProductsModal = ({
  visible,
  onCancel,
  products,
  setProducts,
  allProducts,
  sellers,
  isAdmin,
  shippingId,
  sucursalId,
  allowAddProducts = true,
}: EditProductsModalProps) => {
  const [localProducts, setLocalProducts] = useState<any[]>([]);
  const [searchKey, setSearchKey] = useState<string | null>(null);
  const [tempProductModalVisible, setTempProductModalVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setLocalProducts(
      products.map((p) => {
        const productoCompleto = allProducts.find(
          (ap) => ap.nombre_variante === (p.nombre_variante || p.producto)
        );

        const stockActual = productoCompleto?.stockActual ?? 0;
        const cantidadVendida = Number(p.cantidad || 0);
        const cantidadMaximaEditable = stockActual + cantidadVendida;

        return {
          ...p,
          cantidadMaximaEditable,
        };
      })
    );
  }, [visible, products, allProducts]);

  const handleValueChange = (key: string, field: string, value: any) => {
    setLocalProducts((prev: any[]) =>
      prev.map((p) => {
        if (p.key !== key) return p;

        const updated = { ...p, [field]: value };
        if (field === "cantidad" || field === "precio_unitario") {
          const vendedorId = p.id_vendedor || p.vendedor?._id;
          const vendedor = sellers.find((v: any) => v._id === vendedorId);
          const comision = Number(vendedor?.comision_porcentual || 0);
          const cantidad = Number(updated.cantidad || 0);
          const precio = Number(updated.precio_unitario || 0);
          updated.utilidad = parseFloat(((precio * cantidad * comision) / 100).toFixed(2));
        }

        return updated;
      })
    );
  };

  const handleDeleteProduct = (key: string) => {
    setLocalProducts((prev: any[]) => prev.filter((p) => p.key !== key));
  };

  const allSelectedNames = useMemo(() => {
    return new Set(localProducts.map((p) => p.nombre_variante || p.producto));
  }, [localProducts]);

  const hoy = new Date().setHours(0, 0, 0, 0);
  const filteredOptions = useMemo(() => {
    const vigentes = allProducts.filter((p) => {
      const vendedor = sellers.find((s: any) => s._id === p.id_vendedor);
      if (!vendedor) return false;
      const fecha = vendedor.fecha_vigencia
        ? new Date(vendedor.fecha_vigencia).getTime()
        : Infinity;
      return fecha >= hoy;
    });

    return vigentes
      .filter((p) => {
        const nombre = p.nombre_variante || p.producto;
        const stock = Number(p.stockActual ?? 0);
        return !allSelectedNames.has(nombre) && stock > 0;
      })
      .map((p) => ({
        label: p.nombre_variante || p.producto || "Sin nombre",
        value: p.key,
        rawProduct: p,
      }));
  }, [allProducts, sellers, allSelectedNames, hoy]);

  const handleSelectProduct = (key: string) => {
    const selected = allProducts.find((p) => p.key === key);
    if (!selected) {
      message.warning("Producto no encontrado.");
      return;
    }

    const yaExiste = localProducts.some((prod) => prod.key === key);
    if (yaExiste) {
      message.warning("Este producto ya ha sido anadido.");
      return;
    }

    const vendedor = sellers.find((v: any) => v._id === selected.id_vendedor);
    const comision = vendedor?.comision_porcentual || 0;
    const utilidadCalculada = parseFloat(((selected.precio * comision) / 100).toFixed(2));

    setLocalProducts((prev: any[]) => [
      ...prev,
      {
        ...selected,
        id_producto: selected._id || selected.id_producto,
        cantidad: 1,
        precio_unitario: selected.precio,
        utilidad: utilidadCalculada,
      },
    ]);
    setSearchKey(null);
  };

  const handleGuardar = async () => {
    const existentes = localProducts.filter((p) => p.id_venta);
    const nuevos = localProducts.filter((p) => !("id_venta" in p));

    const temporales = nuevos.filter(
      (p) => p.esTemporal && (!p.id_producto || String(p.id_producto).length !== 24)
    );
    const temporalesYaRegistrados = nuevos.filter(
      (p) => p.esTemporal && p.id_producto && String(p.id_producto).length === 24
    );
    const normales = nuevos.filter(
      (p) => !p.esTemporal && p.id_producto && String(p.id_producto).length === 24
    );

    const originalesMap = new Map<string, any>();
    for (const p of products) {
      if (p.key) originalesMap.set(String(p.key), p);
      if (p.id_venta) originalesMap.set(String(p.id_venta), p);
    }

    const eliminadosConData = products.filter(
      (prev) => !localProducts.some((p) => p.key === prev.key || p.id_venta === prev.id_venta)
    );

    const modificadosConCambioCantidad = existentes.filter((p) => {
      const original = originalesMap.get(String(p.key));
      if (!original) return false;
      return (
        Number(p.cantidad) !== Number(original.cantidad) ||
        Number(p.precio_unitario) !== Number(original.precio_unitario) ||
        Number(p.utilidad) !== Number(original.utilidad)
      );
    });

    try {
      const temporalesPreparados = [];

      for (const temp of temporales) {
        if (!temp.id_producto || String(temp.id_producto).length !== 24) {
          const nuevoProducto = await registerProductAPI({
            nombre_producto: temp.nombre_variante || temp.producto,
            id_vendedor: temp.id_vendedor,
            id_categoria: temp.id_categoria || undefined,
            esTemporal: true,
            sucursales: [
              {
                id_sucursal: sucursalId,
                combinaciones: [
                  {
                    variantes: temp.variantes || { Variante: "Temporal" },
                    precio: temp.precio_unitario,
                    stock: temp.cantidad || 1,
                  },
                ],
              },
            ],
          });

          if (!nuevoProducto?.success) {
            message.error("Error al registrar un producto temporal");
            continue;
          }

          temp.id_producto = nuevoProducto.newProduct._id;
        }

        temporalesPreparados.push({
          cantidad: temp.cantidad,
          precio_unitario: temp.precio_unitario,
          utilidad: temp.utilidad,
          id_producto: temp.id_producto,
          id_pedido: shippingId,
          id_vendedor: temp.id_vendedor,
          sucursal: sucursalId,
          deposito_realizado: false,
          variantes: temp.variantes,
          variantKey: temp.variantKey,
          nombre_variante: temp.nombre_variante || temp.producto,
        });
      }

      const nuevosTodos = [
        ...normales,
        ...temporalesPreparados,
        ...temporalesYaRegistrados.map((p) => ({
          cantidad: p.cantidad,
          precio_unitario: p.precio_unitario,
          utilidad: p.utilidad,
          id_producto: p.id_producto,
          id_pedido: shippingId,
          id_vendedor: p.id_vendedor,
          sucursal: sucursalId,
          deposito_realizado: false,
          variantes: p.variantes,
          variantKey: p.variantKey,
          nombre_variante: p.nombre_variante || p.producto,
        })),
      ];

      if (nuevosTodos.length > 0) {
        const response = await registerSalesToShippingAPI({
          shippingId,
          sales: nuevosTodos,
        });
        if (!response?.success) {
          message.error("No se pudo registrar las ventas");
          return;
        }
      }

      if (modificadosConCambioCantidad.length > 0) {
        const cleaned = modificadosConCambioCantidad.map((p) => ({
          id_venta: p.id_venta,
          cantidad: p.cantidad,
          precio_unitario: p.precio_unitario,
          utilidad: p.utilidad,
          id_producto: p.id_producto,
          quien_paga_delivery: p.quien_paga_delivery,
        }));
        await updateProductsByShippingAPI(shippingId, cleaned);
      }

      if (eliminadosConData.length > 0) {
        const eliminadosIds = eliminadosConData
          .map((p) => p.id_venta)
          .filter((id) => Boolean(id));
        if (eliminadosIds.length > 0) {
          await deleteProductsByShippingAPI(shippingId, eliminadosIds);
        }
      }

      message.success("Productos actualizados con exito");
      setProducts(localProducts);
      onCancel();
    } catch (error) {
      console.error("Error actualizando productos:", error);
      message.error("Error al guardar productos");
    }
  };

  const handleCancelar = () => {
    setLocalProducts([]);
    onCancel();
  };

  return (
    <Modal
      title="Editar Productos del Pedido"
      open={visible}
      onCancel={handleCancelar}
      width={900}
      footer={[
        <Button key="cancel" onClick={handleCancelar}>
          Cancelar
        </Button>,
        <Button key="save" type="primary" onClick={handleGuardar}>
          Guardar
        </Button>,
      ]}
    >
      {allowAddProducts && (
        <div style={{ marginBottom: 16 }}>
          <Button
            style={{ marginBottom: 12 }}
            type="dashed"
            onClick={() => setTempProductModalVisible(true)}
          >
            Agregar Producto Temporal
          </Button>

          <Select
            showSearch
            value={searchKey}
            placeholder="Buscar y anadir producto"
            onChange={handleSelectProduct}
            options={filteredOptions}
            style={{ width: "100%" }}
            allowClear
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>
      )}

      <EmptySalesTable
        products={localProducts}
        onDeleteProduct={handleDeleteProduct}
        handleValueChange={handleValueChange}
        onUpdateTotalAmount={() => {}}
        sellers={sellers}
        isAdmin={isAdmin}
      />

      {allowAddProducts && (
        <ProductSellerViewModal
          visible={tempProductModalVisible}
          onCancel={() => setTempProductModalVisible(false)}
          onSuccess={() => setTempProductModalVisible(false)}
          onAddProduct={(tempProduct: any) => {
            const vendedor = sellers.find((v: any) => v._id === tempProduct.id_vendedor);
            const comision = vendedor?.comision_porcentual || 0;
            const precio = tempProduct.precio_unitario || tempProduct.precio || 0;
            const cantidad = tempProduct.cantidad || 1;
            const utilidad = parseFloat(((precio * cantidad * comision) / 100).toFixed(2));

            setLocalProducts((prev) => [
              ...prev,
              {
                ...tempProduct,
                id_producto: tempProduct._id,
                cantidad,
                precio_unitario: precio,
                utilidad,
                esTemporal: true,
              },
            ]);
          }}
          selectedSeller={null}
          openFromEditProductsModal={true}
          sellers={sellers}
        />
      )}
    </Modal>
  );
};

export default EditProductsModal;

