import { AxiosError } from "axios"
import { apiClient } from "./apiClient"

export const getCategoriesAPI = async () => {
    try {
        const res = await apiClient.get('/category')
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }
    }
}

export const registerCategoryAPI = async (categoryData: any) => {
    try {
        const res = await apiClient.post('/category/register', categoryData)
        return res.data
    } catch (error) {
        const err = error as AxiosError
        if (err && err.response && err.response.data) {
            return { success: false, ...err.response.data }
        }
        return { success: false }

    }
}