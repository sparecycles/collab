import RedisContext, { currentRedisClient } from './redis-context'

export type CommonOps = {
    $path(): string
    $exists(): Promise<boolean>
    $watch(): Promise<void>
    $del(): Promise<boolean>
    $expire(ttl: number): Promise<boolean>
}

export type KeyOps = {
    $set(value: string): Promise<void>
    $value(): Promise<string>
}

export type SetOps = {
    $members(): Promise<string[]>
    $isMember(member: string): Promise<boolean>
    $add(member: string): Promise<void>
    $rem(member: string): Promise<number>
}

export type HashOps = {
    $set(value: string | { [_:string]: string }): Promise<void>
    $get(value: string): Promise<string>
    $getAll(): Promise<{ [_:string]: string }>
    $rem(): Promise<number>
}

export type ListOps = {
    $range(options?: { start: number, stop: number }): Promise<string[]>
    $unshift(value: string): Promise<void>,
    $push(value: string): Promise<void>,
    $shift(): Promise<string>,
    $pop(): Promise<string>,
    $rem(element: string, options?: { count: number }): Promise<number>,
}

export type HashListOps<T> = {
    $allItems(): Promise<(T & { id: string })[]>
}

export type HashSetOps<T> = {
    $allItems(): Promise<{ [_:string]: T }>
}

export type HashListItemOps = {
    $add(item: T, mode = 'push' | 'unshift'): Promise<void>
}

export type HashSetItemOps<T> = {
}

export type scheme = {
    common(path: string): CommonOps
    key(path: string): CommonOps & KeyOps
    hash(path: string): CommonOps & HashOps
    set(path: string): CommonOps & SetOps
    hashList<T = {}, S = {}>(path: string, extra?: T, itemextra?: (id:string) => S): {
        (part: string): CommonOps & ListOps & HashListItemOps<unknown> & T
        (): CommonOps & ListOps & HashListOps<unknown> & S
    }
    hashSet<T = {}, S = {}>(path: string, extra?: T, itemextra?: (id:string) => S): {
        (part: string): CommonOps & HashOps & HashSetItemOps<unknown> & T,
        (): CommonOps & SetOps & HashSetOps<unknown> & S
    }
}

declare const _scheme: scheme
export default _scheme
