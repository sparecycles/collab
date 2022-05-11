import RedisContext, { currentRedisClient } from './redis-context'

export type CommonOps {
    path(): string
    exists(): Promise<boolean>
    watch(): Promise<void>
    del(): Promise<boolean>
}

export type KeyOps = {
    set(value: string): Promise<void>
    value(): Promise<String>
}

export type SetOps = {
    getMembers(): Promise<string[]>
    isMember(member: string): Promise<boolean>
    add(member: string): Promise<void>
    rem(member: string): Promise<number>
}

export type HashOps = {
    set(value: String | { [_:string]: string }): Promise<void>
    get(value: String): Promise<String>
    getAll(): Promise<String>
    rem(): Promise<String>
}

export type ListOps = {
    range(options?: { start: number, stop: number }): Promise<string[]>
    unshift(value: string): Promise<void>,
    push(value: string): Promise<void>,
    shift(): Promise<string>,
    pop(): Promise<string>,
    rem(element: string, options?: { count: number }): Promise<number>,
}

export type HashListOps<T> = {
    addItem(id: string, item: T, mode = 'push' | 'unshift'): Promise<void>
    allItems(): Promise<(T & { id: string })[]>
}

export type HashSetOps<T> = {
    getAllItems(): Promise<{ [_:string]: T }>
}

export type HashListItemOps = {
}

export type HashSetItemOps = {
}

export type scheme = {
    common(path: string): CommonOps
    key(path: string): CommonOps & KeyOps
    hash(path: string): CommonOps & HashOps
    set(path: string): CommonOps & SetOpts
    hashList<T, S>(path: string, extra?: T, itemextra?: (id:string) => S): {
        (part: string): CommonOps & ListOps & HashListOps<unknown> & T
        (): CommonOps & ListOps & HashListItemOps & S
    }
    hashSet<T = {}, S = {}>(path: string, extra?: T, itemextra?: (id:string) => S): {
        (part: string): CommonOps & HashOps & HashSetOps<unknown> & T,
        (): CommonOps & SetOps & HashSetItemOps & S
    }
}

declare const _scheme: scheme
export default _scheme
