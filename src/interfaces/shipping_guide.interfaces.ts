export interface IShippingGuide {
    _id: string,
    vendedor_id: string,
    sucursal_id: string,
    descripcion: string,
    fecha_subida: Date,
    imagen_key: string,
    is_recogido: boolean,
}