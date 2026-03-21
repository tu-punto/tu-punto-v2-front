
import { useState, useEffect } from 'react';
import { getSellersBasicAPI } from '../api/seller';

const useSellers = () => {
    const [sellers, setSellers] = useState([]);

    const fetchSellers = async () => {
        const response = await getSellersBasicAPI();
        setSellers(Array.isArray(response) ? response : []);
    };

    useEffect(() => {
        fetchSellers();
    }, []);

    return { sellers, fetchSellers };
};

export default useSellers;
