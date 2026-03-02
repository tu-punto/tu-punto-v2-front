export interface IUser {
    _id: string;
    role: "admin" | "operator" | "seller";
    sucursalId?: string;
    email: string;
}
