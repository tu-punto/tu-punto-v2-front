export interface IShipping {
    _id: string,
    cliente: string,
    telefono_cliente: string,
    fecha_pedido: Date,
    hora_entrega_acordada: Date,
    hora_entrega_real: Date,
    observaciones: string,
    lugar_origen: string,
    lugar_entrega: string,
    costo_delivery: number,
    cargo_delivery: number,
    estado_pedido: string,
    adelanto_cliente: number,
    esta_pagado: string 
    pagado_al_vendedor: boolean,
    subtotal_qr: number,
    subtotal_efectivo: number,
    venta: string[]
}