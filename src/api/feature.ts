import { AxiosError } from "axios"
import { apiClient } from "./apiClient"

export const getFeaturesAPI = async () => {
    try {
        const res = await apiClient.get(`/feature`)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }
    }
}

export const registerFeatureAPI = async (featureData: any) => {
    try {
        const res = await apiClient.post(`/feature/register`, featureData)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }
    }
}