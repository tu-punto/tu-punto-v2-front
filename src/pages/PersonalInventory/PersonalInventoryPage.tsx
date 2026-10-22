import { Button, Card, Empty, Form, Input, InputNumber, List, Modal, Segmented, Select, Space, Spin, Tag, Typography, message } from "antd";
import { EditOutlined, MinusOutlined, PlusOutlined, SearchOutlined, ShoppingCartOutlined, WalletOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { personalInventoryApi } from "../../api/personalInventory";

type Product = { _id: string; name: string; code?: string; salePrice: number; purchaseCost?: number; stock: number };
type CartRow = Product & { quantity: number; unitPrice: number | null };
type SaleItem = { productId: string; name: string; quantity: number; unitPrice: number; unitCost?: number | null; subtotal: number };
type HistoryRow = { id: string; type: "sale" | "expense" | "adjustment"; occurredAt: string; total?: number; items?: SaleItem[]; amount?: number; description?: string; reason?: string; quantityDelta?: number; product?: { name?: string } };
const money = (value: number) => `Bs. ${Number(value || 0).toFixed(2)}`;

export default function PersonalInventoryPage() {
  const [section, setSection] = useState<string>("productos");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productModal, setProductModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [expenseModal, setExpenseModal] = useState(false);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [saleSearch, setSaleSearch] = useState("");
  const [historyType, setHistoryType] = useState<string | undefined>();
  const [historyProductId, setHistoryProductId] = useState<string | undefined>();
  const [historyFrom, setHistoryFrom] = useState<string | undefined>();
  const [historyTo, setHistoryTo] = useState<string | undefined>();
  const historyRequest = useRef(0);
  const [productForm] = Form.useForm();
  const [expenseForm] = Form.useForm();
  const [adjustForm] = Form.useForm();

  const refreshProducts = useCallback(async () => {
    const res = await personalInventoryApi.products();
    if (res.success) setProducts(res.data || []); else message.error(res.msg);
  }, []);
  const refreshHistory = useCallback(async () => {
    const requestId = ++historyRequest.current;
    setHistoryLoading(true);
    const res = await personalInventoryApi.history({ type: historyType, productId: historyProductId, from: historyFrom, to: historyTo });
    if (requestId !== historyRequest.current) return;
    if (res.success) setHistory(res.data || []); else { setHistory([]); message.error(res.msg); }
    setHistoryLoading(false);
  }, [historyType, historyProductId, historyFrom, historyTo]);
  useEffect(() => { refreshProducts().finally(() => setLoading(false)); }, [refreshProducts]);
  useEffect(() => { refreshHistory(); return () => { historyRequest.current++; }; }, [refreshHistory]);

  const matches = (product: Product, query: string) => {
    const text = query.trim().toLocaleLowerCase();
    return !text || product.name.toLocaleLowerCase().includes(text) || (product.code || "").toLocaleLowerCase().includes(text);
  };
  const filteredProducts = products.filter(product => matches(product, productSearch));
  const saleProducts = products.filter(product => product.stock > 0 && matches(product, saleSearch));
  const cartTotal = useMemo(() => cart.reduce((sum, row) => sum + (row.unitPrice ?? 0) * row.quantity, 0), [cart]);
  const summary = useMemo(() => {
    let sales = 0, expenses = 0, costs = 0, missingCost = false;
    history.forEach(row => {
      if (row.type === "expense") expenses += Number(row.amount || 0);
      if (row.type !== "sale") return;
      const items = (row.items || []).filter(item => !historyProductId || String(item.productId) === historyProductId);
      if (!historyProductId && !row.items?.length) sales += Number(row.total || 0);
      items.forEach(item => {
        sales += Number(item.subtotal || 0);
        if (item.unitCost == null) missingCost = true;
        else costs += Number(item.unitCost) * Number(item.quantity);
      });
      if (!row.items?.length) missingCost = true;
    });
    return { sales, expenses, costs, profit: sales - expenses - costs, missingCost };
  }, [history, historyProductId]);

  const addToCart = (product: Product) => setCart(rows => {
    const existing = rows.find(row => row._id === product._id);
    if (existing) return rows.map(row => row._id === product._id ? { ...row, quantity: Math.min(row.quantity + 1, product.stock) } : row);
    return product.stock > 0 ? [...rows, { ...product, quantity: 1, unitPrice: product.salePrice }] : rows;
  });
  const changeQuantity = (id: string, quantity: number) => setCart(rows => rows.map(row => row._id === id ? { ...row, quantity: Math.max(1, Math.min(quantity, row.stock)) } : row));
  const notifyResult = (res: any, success: string) => { if (res.success) { message.success(success); return true; } message.error(res.msg || "No se pudo guardar"); return false; };
  const openProduct = (product?: Product) => {
    setEditing(product || null);
    productForm.resetFields();
    if (product) productForm.setFieldsValue({ ...product, purchaseCost: product.purchaseCost ?? null, code: product.code || "" });
    setProductModal(true);
  };
  const saveProduct = async () => {
    const values = await productForm.validateFields();
    setSaving(true);
    try {
      const payload = { ...values, code: values.code || "", purchaseCost: values.purchaseCost ?? null };
      const res = editing ? await personalInventoryApi.updateProduct(editing._id, payload) : await personalInventoryApi.createProduct(payload);
      if (notifyResult(res, editing ? "Producto actualizado" : "Producto agregado")) { setProductModal(false); productForm.resetFields(); await Promise.all([refreshProducts(), refreshHistory()]); }
    } finally { setSaving(false); }
  };
  const saveExpense = async () => {
    const values = await expenseForm.validateFields(); setSaving(true);
    try { const res = await personalInventoryApi.createExpense(values); if (notifyResult(res, "Gasto registrado")) { setExpenseModal(false); expenseForm.resetFields(); await refreshHistory(); } } finally { setSaving(false); }
  };
  const saveAdjustment = async () => {
    if (!adjusting) return; const values = await adjustForm.validateFields(); setSaving(true);
    try { const res = await personalInventoryApi.adjustStock(adjusting._id, values); if (notifyResult(res, "Stock actualizado")) { setAdjusting(null); adjustForm.resetFields(); await Promise.all([refreshProducts(), refreshHistory()]); } } finally { setSaving(false); }
  };
  const confirmSale = async () => {
    if (!cart.length || cart.some(row => row.unitPrice == null)) return; setSaving(true);
    try { const res = await personalInventoryApi.createSale(cart.map(row => ({ productId: row._id, quantity: row.quantity, unitPrice: row.unitPrice as number }))); if (notifyResult(res, "Venta registrada y stock actualizado")) { setCart([]); await Promise.all([refreshProducts(), refreshHistory()]); } } finally { setSaving(false); }
  };

  // Intent: venta cotidiana desde móvil; controles Ant Design existentes, jerarquía clara y acento de Tu Punto.
  if (loading) return <div className="p-6 text-center"><Spin /></div>;
  return <main className="p-3 md:p-6 max-w-6xl mx-auto">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><Typography.Title level={2} className="!mb-1">Mi inventario</Typography.Title><Typography.Text type="secondary">Tus productos y registros personales no afectan la operación de Tu Punto.</Typography.Text></div>
      <Space wrap><Button icon={<WalletOutlined />} onClick={() => setExpenseModal(true)}>Registrar gasto</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => openProduct()}>Nuevo producto</Button></Space>
    </div>
    <Segmented block value={section} onChange={setSection} options={[{ label: "Productos", value: "productos" }, { label: `Vender${cart.length ? ` (${cart.length})` : ""}`, value: "vender" }, { label: "Historial", value: "historial" }]} className="mb-4" />
    {section === "productos" && <>
      <Input allowClear prefix={<SearchOutlined />} aria-label="Buscar productos por nombre o código" placeholder="Buscar por nombre o código" value={productSearch} onChange={event => setProductSearch(event.target.value)} className="mb-4" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filteredProducts.length ? filteredProducts.map(product => <Card key={product._id} size="small" className="shadow-sm"><div className="flex justify-between gap-3"><div className="min-w-0"><Typography.Text strong>{product.name}</Typography.Text>{product.code && <div><Typography.Text type="secondary">Código: {product.code}</Typography.Text></div>}<div className="mt-1 text-gray-500">{money(product.salePrice)} · Stock: <b>{product.stock}</b></div></div><Tag color={product.stock > 0 ? "default" : "error"}>{product.stock > 0 ? "Disponible" : "Agotado"}</Tag></div><Space wrap className="mt-4"><Button onClick={() => openProduct(product)} icon={<EditOutlined />}>Editar</Button><Button onClick={() => { setAdjusting(product); adjustForm.resetFields(); }}>Ajustar stock</Button><Button type="primary" disabled={!product.stock} onClick={() => { addToCart(product); setSection("vender"); }}>Vender</Button></Space></Card>) : <Empty description={productSearch ? "No encontramos productos con esa búsqueda" : "Aún no tienes productos personales"} className="sm:col-span-2 lg:col-span-3" />}</div>
    </>}
    {section === "vender" && <div className="grid gap-4 lg:grid-cols-[1fr_360px]"><Card title="Agregar productos"><Input allowClear prefix={<SearchOutlined />} aria-label="Buscar productos para vender" placeholder="Buscar por nombre o código" value={saleSearch} onChange={event => setSaleSearch(event.target.value)} /><List dataSource={saleProducts} locale={{ emptyText: saleSearch ? "No encontramos productos disponibles con esa búsqueda" : "No hay stock disponible" }} renderItem={product => <List.Item actions={[<Button key="add" type="link" onClick={() => addToCart(product)}>Agregar</Button>]}><List.Item.Meta title={product.name} description={`${product.code ? `Código: ${product.code} · ` : ""}${money(product.salePrice)} · ${product.stock} disponibles`} /></List.Item>} /></Card><Card title={<Space><ShoppingCartOutlined />Venta personal</Space>}><List dataSource={cart} locale={{ emptyText: "El carrito está vacío" }} renderItem={row => <List.Item><div className="w-full"><div className="flex justify-between gap-2"><Typography.Text strong>{row.name}</Typography.Text><Typography.Text>{money((row.unitPrice ?? 0) * row.quantity)}</Typography.Text></div><div className="mt-2 flex items-center justify-between gap-2"><label htmlFor={`price-${row._id}`}>Precio unitario</label><InputNumber id={`price-${row._id}`} aria-label={`Precio unitario de ${row.name}`} min={0} precision={2} value={row.unitPrice} onChange={value => setCart(rows => rows.map(item => item._id === row._id ? { ...item, unitPrice: value } : item))} addonBefore="Bs." className="w-36" /></div><Space wrap className="mt-2"><Button aria-label={`Restar unidad de ${row.name}`} icon={<MinusOutlined />} disabled={row.quantity <= 1} onClick={() => changeQuantity(row._id, row.quantity - 1)} /><Typography.Text>{row.quantity}</Typography.Text><Button aria-label={`Añadir unidad de ${row.name}`} icon={<PlusOutlined />} disabled={row.quantity >= row.stock} onClick={() => changeQuantity(row._id, row.quantity + 1)} /><Button type="link" danger onClick={() => setCart(rows => rows.filter(item => item._id !== row._id))}>Quitar</Button></Space></div></List.Item>} /><div className="mt-4 flex flex-wrap gap-3 items-center justify-between"><Typography.Text strong>Total: {money(cartTotal)}</Typography.Text><Button type="primary" loading={saving} disabled={!cart.length || cart.some(row => row.unitPrice == null)} onClick={confirmSale}>Confirmar venta</Button></div><Typography.Text type="secondary" className="text-xs">El precio modificado solo se aplica a esta venta.</Typography.Text></Card></div>}
    {section === "historial" && <Card title="Historial"><div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><Select allowClear placeholder="Tipo" value={historyType} onChange={setHistoryType} options={[{ value: "sale", label: "Ventas" }, { value: "expense", label: "Gastos" }, { value: "adjustment", label: "Ajustes" }]} /><Select allowClear showSearch optionFilterProp="label" placeholder="Producto" value={historyProductId} onChange={setHistoryProductId} options={products.map(product => ({ value: product._id, label: product.code ? `${product.name} · ${product.code}` : product.name }))} /><Input type="date" aria-label="Desde" value={historyFrom} onChange={event => setHistoryFrom(event.target.value || undefined)} /><Input type="date" aria-label="Hasta" value={historyTo} onChange={event => setHistoryTo(event.target.value || undefined)} /></div>
      <Spin spinning={historyLoading}><div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{[{ label: "Total ventas", value: summary.sales }, { label: "Total gastos", value: summary.expenses }, { label: "Costo de productos vendidos", value: summary.costs }, { label: "Ganancia estimada", value: summary.profit }].map(stat => <div key={stat.label} className="rounded-md border border-gray-100 bg-gray-50 p-3"><Typography.Text type="secondary" className="text-xs">{stat.label}</Typography.Text><div className="mt-1 text-base font-semibold tabular-nums">{money(stat.value)}</div></div>)}</div>
      {summary.missingCost && <div className="mt-2"><Typography.Text type="secondary" className="text-xs">Algunas ventas no tienen costo registrado; la ganancia puede estar incompleta.</Typography.Text></div>}
      {historyProductId && <div className="mt-2"><Typography.Text type="secondary" className="text-xs">Los gastos no se incluyen al filtrar por producto.</Typography.Text></div>}
      <List dataSource={history} locale={{ emptyText: "No hay movimientos para estos filtros" }} renderItem={row => <List.Item><List.Item.Meta title={row.type === "sale" ? `Venta · ${money(historyProductId ? (row.items || []).filter(item => String(item.productId) === historyProductId).reduce((sum, item) => sum + item.subtotal, 0) : row.total || 0)}` : row.type === "expense" ? `Gasto · ${money(row.amount || 0)}` : `Ajuste de stock · ${(row.quantityDelta || 0) > 0 ? "+" : ""}${row.quantityDelta}`} description={`${row.description || row.reason || row.product?.name || "Productos personales"} · ${new Date(row.occurredAt).toLocaleString()}`} /></List.Item>} /></Spin></Card>}
    <Modal title={editing ? "Editar producto" : "Nuevo producto"} open={productModal} onCancel={() => setProductModal(false)} onOk={saveProduct} confirmLoading={saving} okText="Guardar" cancelText="Cancelar"><Form form={productForm} layout="vertical"><Form.Item name="name" label="Nombre" rules={[{ required: true, whitespace: true, message: "Ingresa un nombre" }]}><Input autoFocus /></Form.Item><Form.Item name="code" label="Código de producto (opcional)"><Input maxLength={100} /></Form.Item><Form.Item name="salePrice" label="Precio de venta" rules={[{ required: true, message: "Ingresa el precio" }]}><InputNumber min={0} precision={2} className="w-full" /></Form.Item>{!editing && <Form.Item name="stock" label="Stock inicial" rules={[{ required: true, message: "Ingresa el stock" }]}><InputNumber min={0} precision={0} className="w-full" /></Form.Item>}<Form.Item name="purchaseCost" label="Costo de compra o producción (opcional)"><InputNumber min={0} precision={2} className="w-full" /></Form.Item></Form></Modal>
    <Modal title="Registrar gasto" open={expenseModal} onCancel={() => setExpenseModal(false)} onOk={saveExpense} confirmLoading={saving} okText="Guardar" cancelText="Cancelar"><Form form={expenseForm} layout="vertical" initialValues={{ occurredAt: new Date().toISOString().slice(0, 10) }}><Form.Item name="amount" label="Monto" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} className="w-full" /></Form.Item><Form.Item name="description" label="Descripción" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="occurredAt" label="Fecha"><Input type="date" /></Form.Item></Form></Modal>
    <Modal title={`Ajustar stock: ${adjusting?.name || ""}`} open={Boolean(adjusting)} onCancel={() => setAdjusting(null)} onOk={saveAdjustment} confirmLoading={saving} okText="Guardar" cancelText="Cancelar"><Form form={adjustForm} layout="vertical"><Form.Item name="quantityDelta" label="Cantidad a sumar o restar" rules={[{ required: true }]}><InputNumber precision={0} className="w-full" /></Form.Item><Form.Item name="reason" label="Motivo (opcional)"><Input /></Form.Item></Form></Modal>
  </main>;
}
