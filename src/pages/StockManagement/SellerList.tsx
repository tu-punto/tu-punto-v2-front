import React, { useEffect, useState } from 'react';
import { List, Button, Select} from 'antd';
import { Option } from 'antd/es/mentions';
import { getSellersAPI } from '../../api/seller';
import { getGroupsAPI } from '../../api/group';
import { getCategoriesAPI } from '../../api/category';

const SellerList = ({ filterSelected, onSelectSeller, prevKey, onSellersLoaded  }: any) => {
    const [placeholder, setPlaceholder] = useState("Seleccione una opción") 
    const [groups, setGroups] = useState<any[]>([])
    const [sellers, setSellers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([])
    const [filterList, setFilterList] = useState<any[]>([])
    const [idKey, setIdKey] = useState("_id")

    const fetchData = async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sellersResponse = await getSellersAPI();
        //console.log("Sellers recibidos desde API:", sellersResponse);

        const sucursalId = localStorage.getItem("sucursalId");

        const vigentes = sellersResponse.filter((seller: any) => {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const sucursalId = localStorage.getItem("sucursalId");

            return seller.pago_sucursales?.some((pago: any) => {
                const idSucursal = pago.id_sucursal?._id || pago.id_sucursal; // por si viene como objeto
                const perteneceASucursal = String(idSucursal) === String(sucursalId);

                if (!perteneceASucursal) return false;

                const fechaSalida = pago.fecha_salida
                    ? new Date(pago.fecha_salida)
                    : seller.fecha_vigencia
                        ? new Date(seller.fecha_vigencia)
                        : null;

                if (fechaSalida) fechaSalida.setHours(0, 0, 0, 0);

                const vigente = !fechaSalida || fechaSalida >= hoy;

                return vigente;
            });
        });
        vigentes.unshift({ _id: null, name: "Todos" });

        const vigentesConNombre = vigentes.map((seller) => {
            if (!seller._id) return seller; // deja "Todos" intacto
            const marca = seller.marca?.trim() || "Sin marca";
            return {
                ...seller,
                name: `${marca} - ${seller.nombre} ${seller.apellido}`
            };
        });
        setSellers(vigentesConNombre);
        if (onSellersLoaded) {
            onSellersLoaded(vigentesConNombre);
        }
        setFilterList(vigentesConNombre);

        const groupsResponse = await getGroupsAPI();
        setGroups(groupsResponse);

        const categoriesResponse = await getCategoriesAPI();
        for (const category of categoriesResponse) category.name = category.categoria;
        setCategories(categoriesResponse);
    };

    useEffect( () => {
        fetchData()
    }, [prevKey])


    useEffect( () => {
        if(filterSelected == 0){
            setIdKey("_id")
            setFilterList(sellers)
            setPlaceholder("Lista de vendedores")
        }
        else if(filterSelected == 1){
            setIdKey("_id")
            setFilterList(categories)
            setPlaceholder("Lista de categorías")
        }
        else{
            setIdKey("id")
            setFilterList(groups)
            setPlaceholder("Lista de grupos")
        }
    }, [filterSelected])


    return (
        <div style={{marginTop: 30}}>

            <Select
                style={{ width: '100%' }}
                placeholder={placeholder}
                defaultValue={null}                onChange={(value) => onSelectSeller(value)}
                showSearch
                filterOption={(input, option) =>
                    option?.children?.toString().toLowerCase().includes(input.toLowerCase())
                }
            >
            {filterList.map((item) => (
                    <Option key={item[idKey]} value={item[idKey]}>
                        {item.name}
                    </Option>
                ))}
            </Select>
        </div>
        
    );
};

export default SellerList;
