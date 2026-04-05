export interface IUser {
    _id: string;
    role: "admin" | "operator" | "seller";
    is_superadmin?: boolean;
    sucursalId?: string;
    email: string;
}
