import { IUser } from "./IUser";

export interface LoginResponse {
    success: boolean;
    message?: string;
    data?: IUser;
}