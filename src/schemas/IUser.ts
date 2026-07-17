export interface IUser {
    _id: string;
    role: "admin" | "operator" | "seller";
    is_superadmin?: boolean;
    sucursalId?: string;
    sucursal?: string | { _id: string; nombre?: string };
    email: string;
    must_change_password?: boolean;
    system_access_hours?: {
        weekdays?: { enabled: boolean; start: string; end: string };
        saturday?: { enabled: boolean; start: string; end: string };
        sunday?: { enabled: boolean; start: string; end: string };
    };
}
