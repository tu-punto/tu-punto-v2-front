import { AxiosError } from "axios"

export const parseError = (error: AxiosError) => {
    const err = error
    if (err && err.response && err.response.data) {
        return { success: false, ...err.response.data }
    }
    return { succcess: false }
}