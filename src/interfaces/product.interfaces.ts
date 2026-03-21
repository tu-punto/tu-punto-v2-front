export interface IProduct {
    _id: string,
    nombre: string,
    imagen_url?: string,
    categoria: ICategory,
    vendedor_id: string, 
    is_temporal: boolean,
    sucursales: IProductBranchData[],
    fecha_ingreso: Date
}

export interface ICategory {
    _id: string,
    nombre: string,
}

export interface IProductBranchData {
    id_sucursal: string,
    variantes: IProductVariant[],
}

export interface IProductVariant {
    nombre: string,
    precio: number, 
    stock: number,
}