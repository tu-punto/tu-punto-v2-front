export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };

        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle: Limita la ejecución de una función a una vez cada X milisegundos
 * Útil para eventos de scroll o resize
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Memoización simple de resultados
 * Cache los resultados de funciones costosas
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>): ReturnType<T> => {
        const key = JSON.stringify(args);
        
        if (cache.has(key)) {
            return cache.get(key)!;
        }

        const result = fn(...args);
        cache.set(key, result);
        return result;
    }) as T;
}

/**
 * Agrupa elementos de un array por una clave específica
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((result, item) => {
        const group = String(item[key]);
        if (!result[group]) {
            result[group] = [];
        }
        result[group].push(item);
        return result;
    }, {} as Record<string, T[]>);
}

/**
 * Cache simple con TTL (Time To Live)
 */
export class SimpleCache<T> {
    private cache = new Map<string, { value: T; timestamp: number }>();
    private ttl: number;

    constructor(ttlMinutes: number = 5) {
        this.ttl = ttlMinutes * 60 * 1000;
    }

    set(key: string, value: T): void {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    get(key: string): T | null {
        const item = this.cache.get(key);
        
        if (!item) return null;

        const now = Date.now();
        if (now - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    clear(): void {
        this.cache.clear();
    }

    invalidate(key: string): void {
        this.cache.delete(key);
    }

    has(key: string): boolean {
        const item = this.cache.get(key);
        if (!item) return false;

        const now = Date.now();
        if (now - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }
}

/**
 * Lazy loader para componentes pesados
 * Uso: const Component = lazyWithPreload(() => import('./Component'))
 */
export function lazyWithPreload<T extends React.ComponentType<any>>(
    factory: () => Promise<{ default: T }>
) {
    const LazyComponent = React.lazy(factory);
    
    // Agregar método de precarga
    (LazyComponent as any).preload = factory;
    
    return LazyComponent;
}

/**
 * Divide un array en chunks para procesamiento por lotes
 */
export function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Procesa un array en lotes de forma asíncrona
 * Útil para evitar bloquear el hilo principal
 */
export async function processBatch<T, R>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
    const batches = chunk(items, batchSize);
    const results: R[] = [];

    for (const batch of batches) {
        const batchResults = await processor(batch);
        results.push(...batchResults);
        
        // Dar tiempo al navegador para otras tareas
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    return results;
}

/**
 * Compara dos objetos de forma profunda para React.memo
 */
export function deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    
    if (typeof obj1 !== 'object' || obj1 === null ||
        typeof obj2 !== 'object' || obj2 === null) {
        return false;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!deepEqual(obj1[key], obj2[key])) return false;
    }

    return true;
}

/**
 * Hook personalizado para detectar cambios solo en propiedades específicas
 */
export function useShallowCompare<T extends object>(
    value: T,
    keys: (keyof T)[]
): T {
    const prevRef = React.useRef<T>(value);

    return React.useMemo(() => {
        const hasChanged = keys.some(
            key => prevRef.current[key] !== value[key]
        );

        if (hasChanged) {
            prevRef.current = value;
        }

        return prevRef.current;
    }, keys.map(k => value[k]));
}

import React from 'react';
