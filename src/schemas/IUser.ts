export interface IUser {
    _id: string;
    role: "admin" | "seller";
    sucursalId?: string;
    email: string;
}