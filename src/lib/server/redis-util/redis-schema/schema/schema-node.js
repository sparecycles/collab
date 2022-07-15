import {
    expandSpec, hasOps, isContainerType,
} from '../spec/spec-core'

function containedItemProxyFactory(Node, containedType, itemNodeFactory) {
    return function containedItem(key, ...itemArgs) {
        const parent = new Node({ key, parent: this, containedType, itemArgs })
        const contained = (key, ...itemArgs) => Reflect.apply(itemNodeFactory, parent, [key, ...itemArgs])

        const proxy = new Proxy(contained, {
            get(target, property) {
                if (property in parent || parent[property] !== undefined) {
                    const prop = parent[property]
                    if (typeof prop === 'function') {
                        return prop.bind(parent)
                    }
                    return prop
                }

                return target[property]
            },
        })

        parent.$self = proxy

        return proxy
    }
}

function createNodeFactory(spec, { applyNestedMapping }) {
    const { Type, nested } = expandSpec(spec)

    function Node() {
        Reflect.apply(Type, this, arguments)
    }

    Node.prototype = Object.create(Type.prototype)

    if (!hasOps(nested)) {
        applyNestedMapping(nested, Node.prototype)
    }

    if (!isContainerType(Type)) {
        return function(key, ...itemArgs) {
            return new Node({ key, parent: this, itemArgs })
        }
    }

    const { Type: containedType } = expandSpec(nested)

    return containedItemProxyFactory(Node, containedType, createNodeFactory(nested, { applyNestedMapping }))
}

export function defineNode(key, spec, proto, { applyNestedMapping }) {
    const nodeFactory = createNodeFactory(spec, { applyNestedMapping })

    Reflect.defineProperty(proto, key, {
        get() {
            return Reflect.apply(nodeFactory, this, [key])
        },
        enumerable: true,
        configurable: false,
    })
}
