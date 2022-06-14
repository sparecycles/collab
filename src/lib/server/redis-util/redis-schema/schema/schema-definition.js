import spec from '../spec'
import { merge } from '../spec/spec-core/ops-spec'
import { Scheme } from '../spec/spec-core/scheme-ops'

import { defineNode } from './schema-node'

export function schema(fn) {
    const map = fn(spec)

    const schema = applyNestedMapping(map, Object.create(null))

    Reflect.defineProperty(schema, '__source', {
        value: fn,
        enumerable: false,
        configurable: false,
    })

    return schema
}

function applyNestedMapping(map, proto = Object.create(Scheme.prototype)) {
    for (const [key, spec] of Object.entries(map)) {
        defineNode(key, spec, proto, { applyNestedMapping })
    }

    proto.$$nested = map

    return proto
}

export function mergeSchemas(...schemas) {
    return schema(spec => merge(...schemas.map(schema => schema.__source(spec))))
}
