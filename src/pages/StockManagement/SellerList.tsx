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
    const [idKey, setIdKey] = useState("id_vendedor")

    const fetchData = async () => {
        const sellersResponse = await getSellersAPI();
        sellersResponse.unshift({id_vendedor: null, name: "Todos"})
        setSellers(sellersResponse);

        const groupsResponse = await getGroupsAPI()
        setGroups(groupsResponse)

        const categoriesResponse = await getCategoriesAPI()
        for(const category of categoriesResponse)
            category.name = category.categoria
        setCategories(categoriesResponse)

        setFilterList(sellersResponse)
    }

    useEffect( () => {
        fetchData()
    }, [prevKey])


    useEffect( () => {
        if(filterSelected == 0){
            setIdKey("id_vendedor")
            setFilterList(sellers)
            setPlaceholder("Lista de vendedores")
        }
        else if(filterSelected == 1){
            setIdKey("id_categoria")
            setFilterList(categories)
            setPlaceholder("Lista de categorías")
        }
        else{
            setIdKey("id")
            setFilterList(groups)
            setPlaceholder("Lista de grupos")
        }
    }, [filterSelected])

    for(const seller of sellers){
        if(seller.id_vendedor)
            seller.name = `${seller.marca} - ${seller.nombre} ${seller.apellido}`
    }


    return (
        <div style={{marginTop: 30}}>

            <Select
                style={{ width: '100%' }}
                placeholder={placeholder}
                onChange={(value) => onSelectSeller(value)}
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
