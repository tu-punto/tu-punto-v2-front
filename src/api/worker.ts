import { AxiosError } from "axios"
import { apiClient } from "./apiClient"

export const getWorkersAPI = async () => {
    try {
        const res = await apiClient.get(`/worker`)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }
    }
}

export const registerWorkerAPI = async (workerData: any) => {
    try {
        const res = await apiClient.post(`/worker/register`, workerData)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }
    }
}