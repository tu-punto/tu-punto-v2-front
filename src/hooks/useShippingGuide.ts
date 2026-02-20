import { useState } from "react";
import { getShippingByBranchAPI, getShippingGuidesAPI, getShippingGuidesBySellerAPI, markAsDelivered } from "../api/shippingGuide";

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

    const checkShippingDelivered = async (guideId: string) => {
        try {
            const res = await markAsDelivered(guideId)
            if (res.success) {
                console.log("El estado de la guía se ha actualizado correctamente")
            } else {
                console.error("Error al actualizar el estado de la guía")
            }
        } catch (error) {
            console.error("Error al actualizar la guía:", error)
        }
    }

    return {
        guidesList,
        fetchAllGuides,
        fetchGuidesByBranch,
        fetchGuidesBySeller,
        checkShippingDelivered,
    }
}

export default useShippingGuide;