import { IProduct } from "./product.interfaces"

export interface IUser {
    _id: string, 
    email: string,
    role: string,
    sucursal_id: string
}

export interface ISeller {
    _id: string,
    nombre: string, 
    apellido: string,
    telefono: string,
    carnet: number,
    direccion: string,
    marca: string,

    saldo_pendiente?: number,
    deuda?: number,
    comision_porcentual?: number,
    comision_fija?: number,
    fecha_vigencia: Date,
    emite_factura: boolean,
    producto: IProduct[],
}