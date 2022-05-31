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
    $path(): string
    $exists(): Promise<boolean>
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
    $rem(...keys: string[]): Promise<string>
    $get(): Promise<{ [_:string]: string }>
}

interface SetOps extends ContainerOps {
    $add(key: string): Promise<void>
    $rem(key: string): Promise<void>
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

type Primative = string | void | number | boolean | Promise<any> | Primative[] | Set<Primative> // do not include object

type Callable<T> = Parameters<T> extends never ? never : T

type Merge<A, B> =
    A extends Primative ? A & B :
    B extends Primative ? B & A : MergePretty<A, B>

type MergeIndexType<A, B, K> = K extends keyof A ? K extends keyof B ? Merge<A[K], B[K]> : A[K] : B[K]

type MergeFunction<A, B> =
    (A extends (...args: [...infer AParams]) => infer AResult 
    ? B extends (...args: [...infer BParams]) => infer BResult ? {
    (...params: [...AParams]): Merge<AResult, BResult>
} : {
    (...params: [...AParams]): AResult
} : B extends (...args: [...infer BParams]) => infer BResult ? {
    (...params: [...BParams]): BResult
} : {})

type MergePretty<A, B> = A extends Promise<infer U>
    ? B extends Promise<infer V> 
        ? Promise<Merge<Awaited<U>, Awaited<V>>>
        : Promise<Awaited<U>> & B
    : B extends Promise<infer W>
        ? A & Promise<Awaited<W>>
        : keyof (A | B) extends never
            ? MergeFunction<A, B>
            : { [K in keyof (A & B)]: MergeIndexType<A, B, K> } & MergeFunction<A, B>

export function mergeSchemas<P, Q>(a: Schema<P>, b: Schema<Q>): Schema<Merge<P, Q>>
