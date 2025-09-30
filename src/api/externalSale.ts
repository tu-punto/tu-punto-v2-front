import { AxiosError } from "axios";
import { apiClient } from "./apiClient";

const getExternalSalesAPI = async () => {
    try {
        const res = await apiClient.get("/external");
        return res.data;
    } catch (error) {
        const err = error as AxiosError;
        if (err && err.response && err.response.data) {
            return {success: false, ...err.response.data};
        }
        return {success: false}
    }
}

const registerExternalSaleAPI = async (saleData: any) => {
    try {
        const res = await apiClient.post("/external/register", saleData);
        return {success: true, ...res.data};
    } catch (error) {
        const err = error as AxiosError;
        if (err && err.response && err.response.data) {
            return {success: false, ...err.response.data};
        }
        return {success: false}
    }

}

export {
    getExternalSalesAPI,
    registerExternalSaleAPI,
}