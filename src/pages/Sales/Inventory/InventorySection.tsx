import { useEffect, useState } from "react";
import { Button, Input, Select, message } from "antd";
import ProductTable from "../../Product/ProductTable";
import ProductSellerViewModal from "../../Seller/ProductSellerViewModal";
import { getSellersAPI } from "../../../api/seller";
import CardSection from "../../../components/CardSection";
import useProductsFlat from "../../../hooks/useProductsFlat";
import { useUserRole } from "../../../hooks/useUserRole";

interface InventorySectionProps {
    branchID: string | null,
    selectBranch: (branchId: string) => void,
    activeBranchs: any[],
    onProductSelect?: (product: any) => void,
}

function InventorySection({ branchID, selectBranch, activeBranchs, onProductSelect }: InventorySectionProps) {
    const { isAdmin, isOperator, isSeller, user } = useUserRole()
    const [showProductAddModal, setShowProductAddModal] = useState(false)
    const [searchText, setSearchText] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<string>('all')
    const [sellers, setSellers] = useState([])
    const [filteredBySeller, setFilteredBySeller] = useState<any[]>([]);
    const [selectedSellerId, setSelectedSellerId] = useState<number | undefined>(undefined)

    const { data, fetchProducts } = useProductsFlat(
        branchID && branchID !== "undefined" ? branchID : undefined
    );

    const fetchSellers = async () => {
        try {
            const response = await getSellersAPI();
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            if (!branchID) {
                console.warn("Sucursal ID no disponible aún para filtrar vendedores");
                setSellers([]);
                return;
            }

            const sellersVigentes = response.filter((v: any) => {
                return v.pago_sucursales?.some((pago: any) => {
                    const idSucursal = pago.id_sucursal?._id || pago.id_sucursal;
                    if (!(String(idSucursal) === String(branchID))) return false;

                    const fechaSalida = pago.fecha_salida
                        ? new Date(pago.fecha_salida)
                        : v.fecha_vigencia
                            ? new Date(v.fecha_vigencia)
                            : null;
                    if (fechaSalida) fechaSalida.setHours(0, 0, 0, 0);
                    return !fechaSalida || fechaSalida >= hoy;
                });
            });
            setSellers(sellersVigentes);
        } catch (error) {
            message.error('Error al obtener los vendedores');
        }
    };

    useEffect(() => {
        if (branchID) {
            fetchSellers();
        }
    }, [branchID]);

    useEffect(() => {
        if (!data || data.length === 0) {
            setFilteredBySeller([]);
            return;
        }

        const vendedoresVigentesIds = sellers.map((v: any) => String(v._id));

        let filtered = data.filter((p: any) => {
            if (p.stockActual <= 0 || selectedProduct !== 'all' && selectedProduct !== p.id_producto) return false;
            return vendedoresVigentesIds.includes(String(p.id_vendedor));
        });

        if ((isAdmin || isOperator) && selectedSellerId) {
            filtered = filtered.filter(p => String(p.id_vendedor) === String(selectedSellerId));
        } else if (!isAdmin && !isOperator) {
            filtered = filtered.filter(p => String(p.id_vendedor) === String(user.id_vendedor));
        }

        if (searchText.trim()) {
            const lower = searchText.trim().toLowerCase();
            const words = lower.split(" ");
            const specialChars = /[!@#$%^&*?:{}|<>]/

            const filterWords = (p: any, words: string[]) => {
                let match = true;
                for (const word of words) {
                    if (!match) return false;
                    if (specialChars.test(word)) continue;
                    match = match && (p.producto ?? '').toString().toLowerCase().includes(word);
                }
                return match;
            };

            filtered = filtered.filter(p => filterWords(p, words));
        }
        filtered = filtered.map((p: any) => {
            const vendedor = sellers.find((v: any) => String(v._id) === String(p.id_vendedor));
            return {
                ...p,
                vendedor: vendedor ? `${vendedor.nombre} ${vendedor.apellido}` : "Sin vendedor"
            };
        });
        setFilteredBySeller(filtered);
    }, [data, selectedSellerId, isAdmin, isOperator, user?.id_vendedor, searchText, sellers, selectedProduct]);
    
    const [productOptions, setProductOptions] = useState<JSX.Element[]>([])
    useEffect(() => {
        if (!data || data.length === 0) return

        const rawProducts = new Map<string, string>();
        data.forEach(product => {
            if (!rawProducts.has(product.id_producto) && product.id_vendedor == user.id_vendedor) {
                rawProducts.set(product.id_producto, product.producto.split(" - ")[0])
            }
        })
        const options: JSX.Element[] = [];
        rawProducts.forEach((value, key) => {
            options.push(
                <Select.Option key={key} value={key}>{value}</Select.Option>
            )
        })
        setProductOptions(options)
    }, [data, user]);

    const handleProductModalCancel = () => {
        setShowProductAddModal(false);
    };

    const handleSuccessProductModal = async () => {
        setShowProductAddModal(false);
        await fetchProducts();
    };

    const handleProductSelect = (product: any) => {
        if (onProductSelect) {
            onProductSelect(product);
        }
    };

    const actions = (
        <>
            <Input.Search
                placeholder="Buscar producto..."
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 200 }}
                allowClear
            />
            {isSeller && (
                <>
                    <Select
                        placeholder="Sucursal"
                        value={branchID}
                        onChange={(value) => { selectBranch(value) }}
                        options={activeBranchs}
                        style={{ minWidth: 180 }}
                        allowClear
                    />
                    <Select
                        value={selectedProduct}
                        onChange={setSelectedProduct}
                        style={{ width: 180 }}
                    >
                        <Select.Option key="all" value="all">Todos los productos</Select.Option>
                        {productOptions}
                    </Select>
                </>
            )}
            {(isAdmin || isOperator) && (
                <Select
                    placeholder="Selecciona un vendedor"
                    options={sellers.map((vendedor: any) => ({
                        value: vendedor._id,
                        label: vendedor.nombre + " " + vendedor.apellido,
                    }))}
                    filterOption={(input, option: any) =>
                        option.label.toLowerCase().includes(input.toLowerCase())
                    }
                    style={{ minWidth: 200 }}
                    onChange={(value) => setSelectedSellerId(value)}
                    showSearch
                    allowClear
                />
            )}
            <Button
                type="primary"
                onClick={() => setShowProductAddModal(true)}
                className="text-mobile-base xl:text-desktop-sm"

            >
                Añadir nuevo producto
            </Button>
        </>
    )


    return (
        <CardSection
            title="Inventario"
            actions={actions}
        >
            <>
                <ProductTable
                    onSelectProduct={handleProductSelect}
                    data={filteredBySeller}
                />

                <ProductSellerViewModal
                    visible={showProductAddModal}
                    onCancel={handleProductModalCancel}
                    onSuccess={handleSuccessProductModal}
                    onAddProduct={(newProduct: any) => {
                        if (onProductSelect) {
                            onProductSelect(newProduct);
                        }
                    }}
                    selectedSeller={
                        isAdmin || isOperator 
                            ? sellers.find((s: any) => s._id === selectedSellerId) || null
                            : { _id: user?.id_vendedor, nombre: user?.nombre_vendedor?.split(" ")[0] || "", apellido: user?.nombre_vendedor?.split(" ")[1] || "" }
                    }
                    sellers={sellers}
                    sucursalId={branchID}
                />
            </>
        </CardSection>
    );
}

export default InventorySection;