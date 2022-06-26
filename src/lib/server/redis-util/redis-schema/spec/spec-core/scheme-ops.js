import { isContainerInstance } from './create-ops'

/**
 * A base class for all Ops nodes.  Ops nodes contain links to parents that
 * can be used to manage data relationships.
 * @param {{ key: string, parent: Scheme | any }} options options for this scheme node
 */
export function Scheme({
    key,
    parent,
    containedType,
    itemArgs,
    ...options
}) {
    this._type = this.constructor.name
    this._key = key
    this._parent = parent instanceof Scheme ? parent : null
    this._containedType = containedType
    this._options = options
    this._itemArgs = itemArgs
}

Object.assign(Scheme.prototype, {
    $path() {
        const pieces = []
        this.__assemblePath(pieces)
        return pieces.join(':')
    },
    $del() {
        return Promise.all([
            this.$$removeFromContainer(),
            ...this.$$removeNested(),
        ])
    },
    // deletes just this value without cleaning up contained or references in parent.
    $$delThis: Function.prototype,
    // removes this item from
    $$removeNested() {
        return [
            this.$$delContained?.(),
            this.$$delThis?.(),
            ...Object.keys(this.$$nested || {}).map(key => this[key].$$removeNested()),
        ]
    },
    // removes this item from any parent container.
    $$removeFromContainer() {
        const { _parent: parent, _key: key } = this

        if (isContainerInstance(parent)) {
            return parent.$rem(key, ...this._itemArgs)
        }
    },
    __assemblePath(pieces) {
        this._parent?.__assemblePath(pieces)
        pieces.push(this._key)
    },
})

