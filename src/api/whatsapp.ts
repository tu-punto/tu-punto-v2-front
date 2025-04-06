import { AxiosError } from "axios"
import { apiClient } from "./apiClient"
import { parseError } from "./util"

export const sendHelloAPI = async(phone: string) => {
    try {
        const res = await apiClient.post('/whats/sendHello', {phone})
        return res.data
    } catch (error) {
        return parseError(error as AxiosError)
    }
}

export const sendMessageAPI = async(phone: string, msg: string) => {
    try {
        const res = await apiClient.post('/whats/sendMessage', {message: msg})
        return res.data
    } catch (error) {
        return parseError(error as AxiosError)
    }
}