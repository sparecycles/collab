import { isContainerType } from './create-ops'
import { Scheme } from './scheme-ops'

const Ops = Symbol('Ops')

export function merge(...mappingsOrOps) {
    return mappingsOrOps.length === 0 ? {} : mappingsOrOps.reduce(merge2)

    function merge2(m1, m2) {
        if (m1[Ops] || m2[Ops]) {
            return merge2Ops(m1, m2)
        }

        return merge2Mappings(m1, m2)
    }

    function merge2Mappings(m1, m2) {
        return [m1, m2].flatMap(Object.entries).reduce(
            (result, [k, v]) => Object.assign(result, {
                [k]: result[k] ? merge2(result[k], v) : v,
            }),
            {}
        )
    }

    function merge2Ops(op1, op2) {
        if (op1[Ops] !== op2[Ops]) {
            throw new Error('conflict in optypes mergin ops')
        }

        return {
            [Ops]: op1[Ops],
            nested: merge(op1.nested, op2.nested),
        }
    }
}

export function hasOps(spec) {
    return Boolean(spec[Ops])
}

export function expandSpec(spec) {
    if (hasOps(spec)) {
        const { [Ops]: Type, nested } = spec
        return { Type, nested }
    }

    return { Type: Scheme, nested: spec }
}

export function createSpec(Type, children) {
    const nested = merge(...children)

    if (hasOps(nested) && !isContainerType(Type)) {
        throw new Error('only container types can have contained elements, this is a ' + Type.name)
    }

    return {
        [Ops]: Type,
        nested,
    }
}
