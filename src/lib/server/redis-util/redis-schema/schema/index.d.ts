interface CommonOpsFactory<T extends Scheme> {
    <M extends Exclude<M, Scheme>>(arg: M): T & M
    (): T
}

interface ContainerOpsFactory<C extends ContainerOps> extends CommonOpsFactory<C> {
    <I extends Scheme>(arg: I): C & {
        (key: string, ...args: any[]): I
    }
}

interface Scheme {
    $del(): Promise<void>
}

interface CommonOps extends Scheme {
    $expire(time: number): Promise<void>
}

interface ContainerOps extends CommonOps {
    $items(fn?: Function): Promise<any>
}

interface RangeOps extends ContainerOps {
}

interface KeyOps extends CommonOps {
}

interface HashOps extends CommonOps {
    $set(key: string, value: string): Promise<void>
    $get(key: string): Promise<string>
    $get(): Promise<{ [_:string]: string }>
}

interface SetOps extends ContainerOps {
    $add(key: string): Promise<void>
    $has(key: string): Promise<boolean>
    $get(): Promise<Set<string>>
}

interface Spec {
    key: CommonOpsFactory<KeyOps>
    hash: CommonOpsFactory<HashOps>
    range: ContainerOpsFactory<RangeOps>
    set: ContainerOpsFactory<SetOps>
}

type SpecMap<T> = T
type Schema<T> = T

export function schema<T>(schemaFn: (spec: Spec) => SpecMap<T>): Schema<T>

type Primative = string | void | number | boolean | Promise<Primative> | Primative[] | Set<Primative> // do not include object

type Callable<T> = Parameters<T> extends never ? never : T

type Merge<A, B> =
    A extends Primative ? A & B :
    B extends Primative ? B & A : MergePretty<A, B>

type MergeIndexType<A, B, K> = K extends keyof A ? K extends keyof B ? Merge<A[K], B[K]> : A[K] : B[K]

type MergeFunction<A, B> = A extends Function ? B extends Function ? {
    (...params: Parameters<A> | Parameters<B>): Merge<ReturnType<A>, ReturnType<B>>
} : {
    (...params: Parameters<A>): ReturnType<A>
} : B extends Function ? {
    (...params: Parameters<B>): ReturnType<B>
} : unknown

type MergePretty<A, B> = A extends Promise<infer U> ? B extends Promise<infer V> 
    ? Promise<Merge<Awaited<U>, Awaited<V>>>
    : Promise<Awaited<U>> & B
    : B extends Promise<infer W> ? A & Promise<Awaited<W>> :
    keyof (A & B) extends never ? MergeFunction<A, B> : {
        [K in keyof (A & B)]: MergeIndexType<A, B, K>
    } & MergeFunction<A, B>

export function mergeSchemas<P, Q>(a: Schema<P>, b: Schema<Q>): Schema<Merge<P, Q>>
