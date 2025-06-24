import React, { useEffect, useState } from 'react';
import { List, Button, Select} from 'antd';
import { Option } from 'antd/es/mentions';
import { getSellersAPI } from '../../api/seller';
import { getGroupsAPI } from '../../api/group';
import { getCategoriesAPI } from '../../api/category';

const SellerList = ({ filterSelected, onSelectSeller, prevKey }: any) => {
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

        const vigentes = sellersResponse.filter((seller: any) => {
            const vigencia = seller.fecha_vigencia ? new Date(seller.fecha_vigencia) : null;
            if (vigencia) vigencia.setHours(0, 0, 0, 0);
            return !vigencia || vigencia >= today;
        });

        vigentes.unshift({ _id: null, name: "Todos" });

        for (const seller of vigentes) {
            if (seller._id) {
                const marca = seller.marca?.trim() || "Sin marca";
                seller.name = `${marca} - ${seller.nombre} ${seller.apellido}`;
            }
        }

        setSellers(vigentes);
        setFilterList(vigentes);

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

    for (const seller of sellers) {
        if (seller._id) {
            const marca = seller.marca?.trim() || "Sin marca";
            seller.name = `${marca} - ${seller.nombre} ${seller.apellido}`;
        }
    }

    return (
        <div style={{marginTop: 30}}>

            <Select
                style={{ width: '100%' }}
                placeholder={placeholder}
                onChange={(value) => onSelectSeller(value)}
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
