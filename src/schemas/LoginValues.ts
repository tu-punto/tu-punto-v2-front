export interface LoginValues {
    email: string;
    password: string;
    // Admin: requiere sucursal, Seller: no
    sucursalId?: string;
}