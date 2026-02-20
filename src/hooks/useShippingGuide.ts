import { useState } from "react";
import { getShippingByBranchAPI, getShippingGuidesAPI, getShippingGuidesBySellerAPI } from "../api/shippingGuide";

function useShippingGuide() {
    const [guidesList, setGuidesList] = useState([]);

    const fetchAllGuides = async () => {
        try {
            const apiData = await getShippingGuidesAPI();
            const sortedData = apiData.sort(
                (a: any, b: any) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime()
            );
            setGuidesList(sortedData)
        } catch (error) {
            console.error("Error al obtener Guías de Envío: ", error)
        }
    }
    const fetchGuidesBySeller = async (search_id: string) => {
        try {
            const apiData = await getShippingGuidesBySellerAPI(search_id);
            const sortedData = apiData.sort(
                (a: any, b: any) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime()
            );
            setGuidesList(sortedData)
        } catch (error) {
            console.error("Error al obtener Guías de Envío por vendedor: ", error)
        }
    };

    const fetchGuidesByBranch = async (search_id: string) => {
        try {
            const apiData = await getShippingByBranchAPI(search_id);
            const sortedData = apiData.sort(
                (a: any, b: any) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime()
            );
            setGuidesList(sortedData)
        } catch (error) {
            console.error("Error al obtener Guías de Envío por vendedor: ", error)
        }
    }

    return {
        guidesList,
        fetchAllGuides,
        fetchGuidesByBranch,
        fetchGuidesBySeller,
    }
}

export default useShippingGuide;