import { AxiosError } from "axios";
import { apiClient, apiClientNoJSON } from "./apiClient";

const getShippingGuidesAPI = async () => {
    try {
        const res = await apiClient.get("/shippingGuide");
        return res.data;
    } catch (error) {
        const err = error as AxiosError;
        if (err && err.response && err.response.data) {
            return {success: false, ...err.response.data};
        }
        return {success: false}
    }
}

const getShippingGuidesBySellerAPI = async(sellerID: string) => {
    try {
        const res = await apiClient.get(`/shippingGuide/seller/${sellerID}`);
        return res.data;
    } catch (error) {
        const err = error as AxiosError;
        if (err && err.response && err.response.data) {
            return {success: false, ...err.response.data};
        }
        return {success: false}
    }
}

const getShippingByBranchAPI = async(branchID: string) => {
    try {
        const res = await apiClient.get(`/shippingGuide/branch/${branchID}`);
        return res.data;
    } catch (error) {
        const err = error as AxiosError;
        if (err && err.response && err.response.data) {
            return {success: false, ...err.response.data};
        }
        return {success: false}
    }
}

const registerShippingGuideAPI = async (formData: any) => {
    try {
        const res = await apiClientNoJSON.post("/shippingGuide/upload", formData);
        return {success: true, ...res.data};
    } catch (error) {
        const err = error as AxiosError;
        if (err && err.response && err.response.data) {
            return {success: false, ...err.response.data};
        }
        return {success: false}
    }
} 

const markAsDelivered = async (shippingGuideID: string) => {
    try {
        await apiClient.put(`/shippingGuide/mark-deliver/${shippingGuideID}`)
        return {success: true}
    } catch (error) {
        const err = error as AxiosError;
        if (err && err.response && err.response.data) {
            return {success: false, ...err.response.data};
        }
        return {success: false}
    }
}

export {
    getShippingGuidesAPI,
    getShippingGuidesBySellerAPI,
    getShippingByBranchAPI,
    registerShippingGuideAPI,
    markAsDelivered,
}