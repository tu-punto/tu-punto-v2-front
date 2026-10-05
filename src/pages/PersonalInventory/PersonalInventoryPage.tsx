import { Button, Card, Empty, Form, Input, InputNumber, List, Modal, Segmented, Select, Space, Spin, Tag, Typography, message } from "antd";
import { MinusOutlined, PlusOutlined, ShoppingCartOutlined, WalletOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { personalInventoryApi } from "../../api/personalInventory";

type Product = { _id: string; name: string; salePrice: number; purchaseCost?: number; stock: number };
type CartRow = Product & { quantity: number };
const money = (value: number) => `Bs. ${Number(value || 0).toFixed(2)}`;

export default function PersonalInventoryPage() {
  const [section, setSection] = useState<string>("productos");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartRow[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [productModal, setProductModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [historyType, setHistoryType] = useState<string | undefined>();
  const [historyProductId, setHistoryProductId] = useState<string | undefined>();
  const [historyFrom, setHistoryFrom] = useState<string | undefined>();
  const [historyTo, setHistoryTo] = useState<string | undefined>();
  const [productForm] = Form.useForm(); const [expenseForm] = Form.useForm(); const [adjustForm] = Form.useForm();

  const refreshProducts = useCallback(async () => { const res = await personalInventoryApi.products(); if (res.success) setProducts(res.data || []); }, []);
  const refreshHistory = useCallback(async () => { const res = await personalInventoryApi.history({ type: historyType, productId: historyProductId, from: historyFrom, to: historyTo }); if (res.success) setHistory(res.data || []); }, [historyType, historyProductId, historyFrom, historyTo]);
  useEffect(() => { Promise.all([refreshProducts(), refreshHistory()]).finally(() => setLoading(false)); }, [refreshProducts, refreshHistory]);
  const cartTotal = useMemo(() => cart.reduce((sum, row) => sum + row.salePrice * row.quantity, 0), [cart]);
  const addToCart = (product: Product) => setCart(rows => {
    const existing = rows.find(row => row._id === product._id);
    if (existing) return rows.map(row => row._id === product._id ? { ...row, quantity: Math.min(row.quantity + 1, product.stock) } : row);
    return product.stock > 0 ? [...rows, { ...product, quantity: 1 }] : rows;
  });
  const changeQuantity = (id: string, quantity: number) => setCart(rows => rows.map(row => row._id === id ? { ...row, quantity: Math.max(1, Math.min(quantity, row.stock)) } : row));
  const notifyResult = (res: any, success: string) => { if (res.success) { message.success(success); return true; } message.error(res.msg || "No se pudo guardar"); return false; };
  const saveProduct = async () => { const values = await productForm.validateFields(); const res = await personalInventoryApi.createProduct(values); if (notifyResult(res, "Producto agregado")) { setProductModal(false); productForm.resetFields(); refreshProducts(); refreshHistory(); } };
  const saveExpense = async () => { const values = await expenseForm.validateFields(); const res = await personalInventoryApi.createExpense(values); if (notifyResult(res, "Gasto registrado")) { setExpenseModal(false); expenseForm.resetFields(); refreshHistory(); } };
  const saveAdjustment = async () => { if (!adjusting) return; const values = await adjustForm.validateFields(); const res = await personalInventoryApi.adjustStock(adjusting._id, values); if (notifyResult(res, "Stock actualizado")) { setAdjusting(null); adjustForm.resetFields(); refreshProducts(); refreshHistory(); } };
  const confirmSale = async () => { if (!cart.length) return; const res = await personalInventoryApi.createSale(cart.map(row => ({ productId: row._id, quantity: row.quantity }))); if (notifyResult(res, "Venta registrada y stock actualizado")) { setCart([]); refreshProducts(); refreshHistory(); } };

  // Intent: vendedores móviles que registran una venta entre clientes; debe sentirse directo, sereno y confiable.
  // Hierarchy: el siguiente paso (agregar, vender o registrar) domina cada sección; stock y contexto permanecen secundarios.
  // Palette/depth/spacing: se reutilizan los neutros y controles Ant Design existentes, tarjetas blancas suaves y grilla de 4px para no crear una segunda identidad visual.
  if (loading) return <div className="p-6 text-center"><Spin /></div>;
  return <main className="p-3 md:p-6 max-w-6xl mx-auto">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><Typography.Title level={2} className="!mb-1">Mi inventario</Typography.Title><Typography.Text type="secondary">Tus productos y registros personales no afectan la operación de Tu Punto.</Typography.Text></div>
      <Space wrap><Button icon={<WalletOutlined />} onClick={() => setExpenseModal(true)}>Registrar gasto</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setProductModal(true)}>Nuevo producto</Button></Space>
    </div>
    <Segmented block value={section} onChange={setSection} options={[{ label: "Productos", value: "productos" }, { label: `Vender${cart.length ? ` (${cart.length})` : ""}`, value: "vender" }, { label: "Historial", value: "historial" }]} className="mb-4" />
    {section === "productos" && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{products.length ? products.map(product => <Card key={product._id} size="small" className="shadow-sm"><div className="flex justify-between gap-3"><div><Typography.Text strong>{product.name}</Typography.Text><div className="mt-1 text-gray-500">{money(product.salePrice)} · Stock: <b>{product.stock}</b></div></div><Tag color={product.stock > 0 ? "default" : "error"}>{product.stock > 0 ? "Disponible" : "Agotado"}</Tag></div><Space className="mt-4"><Button size="small" onClick={() => { setAdjusting(product); adjustForm.resetFields(); }}>Ajustar stock</Button><Button size="small" type="primary" disabled={!product.stock} onClick={() => addToCart(product)}>Vender</Button></Space></Card>) : <Empty description="Aún no tienes productos personales" className="sm:col-span-2 lg:col-span-3" />}</div>}
    {section === "vender" && <div className="grid gap-4 lg:grid-cols-[1fr_360px]"><Card title="Agregar productos"><List dataSource={products.filter(p => p.stock > 0)} locale={{ emptyText: "No hay stock disponible" }} renderItem={product => <List.Item actions={[<Button key="add" type="link" onClick={() => addToCart(product)}>Agregar</Button>]}><List.Item.Meta title={product.name} description={`${money(product.salePrice)} · ${product.stock} disponibles`} /></List.Item>} /></Card><Card title={<Space><ShoppingCartOutlined />Venta personal</Space>}><List dataSource={cart} locale={{ emptyText: "El carrito está vacío" }} renderItem={row => <List.Item><div className="w-full"><div className="flex justify-between"><Typography.Text strong>{row.name}</Typography.Text><Typography.Text>{money(row.salePrice * row.quantity)}</Typography.Text></div><Space className="mt-2"><Button size="small" icon={<MinusOutlined />} onClick={() => changeQuantity(row._id, row.quantity - 1)} /><Typography.Text>{row.quantity}</Typography.Text><Button size="small" icon={<PlusOutlined />} disabled={row.quantity >= row.stock} onClick={() => changeQuantity(row._id, row.quantity + 1)} /><Button size="small" type="link" danger onClick={() => setCart(rows => rows.filter(item => item._id !== row._id))}>Quitar</Button></Space></div></List.Item>} /><div className="mt-4 flex items-center justify-between"><Typography.Text strong>Total: {money(cartTotal)}</Typography.Text><Button type="primary" disabled={!cart.length} onClick={confirmSale}>Confirmar venta</Button></div></Card></div>}
    {section === "historial" && <Card title="Historial"><div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><Select allowClear placeholder="Tipo" value={historyType} onChange={setHistoryType} options={[{ value: "sale", label: "Ventas" }, { value: "expense", label: "Gastos" }, { value: "adjustment", label: "Ajustes" }]} /><Select allowClear showSearch optionFilterProp="label" placeholder="Producto" value={historyProductId} onChange={setHistoryProductId} options={products.map(product => ({ value: product._id, label: product.name }))} /><Input type="date" aria-label="Desde" value={historyFrom} onChange={event => setHistoryFrom(event.target.value || undefined)} /><Input type="date" aria-label="Hasta" value={historyTo} onChange={event => setHistoryTo(event.target.value || undefined)} /></div><List dataSource={history} locale={{ emptyText: "No hay movimientos para estos filtros" }} renderItem={row => <List.Item><List.Item.Meta title={row.type === "sale" ? `Venta · ${money(row.total)}` : row.type === "expense" ? `Gasto · ${money(row.amount)}` : `Ajuste de stock · ${row.quantityDelta > 0 ? "+" : ""}${row.quantityDelta}`} description={`${row.description || row.reason || row.product?.name || "Productos personales"} · ${new Date(row.occurredAt).toLocaleString()}`} /></List.Item>} /></Card>}
    <Modal title="Nuevo producto" open={productModal} onCancel={() => setProductModal(false)} onOk={saveProduct} okText="Guardar"><Form form={productForm} layout="vertical"><Form.Item name="name" label="Nombre" rules={[{ required: true, message: "Ingresa un nombre" }]}><Input autoFocus /></Form.Item><Form.Item name="salePrice" label="Precio de venta" rules={[{ required: true }]}><InputNumber min={0} precision={2} className="w-full" /></Form.Item><Form.Item name="stock" label="Stock inicial" rules={[{ required: true }]}><InputNumber min={0} precision={0} className="w-full" /></Form.Item><Form.Item name="purchaseCost" label="Costo de compra (opcional)"><InputNumber min={0} precision={2} className="w-full" /></Form.Item></Form></Modal>
    <Modal title="Registrar gasto" open={expenseModal} onCancel={() => setExpenseModal(false)} onOk={saveExpense} okText="Guardar"><Form form={expenseForm} layout="vertical" initialValues={{ occurredAt: new Date().toISOString().slice(0, 10) }}><Form.Item name="amount" label="Monto" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} className="w-full" /></Form.Item><Form.Item name="description" label="Descripción" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="occurredAt" label="Fecha"><Input type="date" /></Form.Item></Form></Modal>
    <Modal title={`Ajustar stock: ${adjusting?.name || ""}`} open={Boolean(adjusting)} onCancel={() => setAdjusting(null)} onOk={saveAdjustment} okText="Guardar"><Form form={adjustForm} layout="vertical"><Form.Item name="quantityDelta" label="Cantidad a sumar o restar" rules={[{ required: true }]}><InputNumber precision={0} className="w-full" /></Form.Item><Form.Item name="reason" label="Motivo" rules={[{ required: true }]}><Input /></Form.Item></Form></Modal>
  </main>;
}
