import React from "react";
import { Select } from "antd";

type SellerListProps = {
    sellers: any[];
    selectedSeller: string | null;
    onSelectSeller: (sellerId: string | null) => void;
};

const SellerList = ({ sellers, selectedSeller, onSelectSeller }: SellerListProps) => {
    return (
        <div style={{ marginTop: 30 }}>
            <Select
                style={{ width: "100%" }}
                placeholder="Lista de vendedores"
                value={selectedSeller}
                onChange={(value) => onSelectSeller(value)}
                showSearch
                filterOption={(input, option) =>
                    option?.children?.toString().toLowerCase().includes(input.toLowerCase())
                }
            >
                {(Array.isArray(sellers) ? sellers : []).map((item: any) => (
                    <Select.Option key={item._id ?? "all"} value={item._id ?? null}>
                        {item.name || `${item.marca || "Sin marca"} - ${item.nombre || ""} ${item.apellido || ""}`}
                    </Select.Option>
                ))}
            </Select>
        </div>
    );
};

export default SellerList;
