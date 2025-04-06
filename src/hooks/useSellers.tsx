
import { useState, useEffect } from 'react';
import { getSellersAPI } from '../api/seller';

const useSellers = () => {
    const [sellers, setSellers] = useState([]);

    const fetchSellers = async () => {
        const response = await getSellersAPI();
        setSellers(response);
    };

    useEffect(() => {
        fetchSellers();
    }, []);

    return { sellers, fetchSellers };
};

export default useSellers;
