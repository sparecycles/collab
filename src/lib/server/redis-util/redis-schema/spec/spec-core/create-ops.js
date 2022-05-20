import { Scheme } from './scheme-ops'

/**
 * create Ops classes, chaining the Scheme constructor,
 * assigns prototype methods.
 */
export function createOps(name, { isContainer, extends: inherits = Scheme }, prototype) {
    // eslint-disable-next-line no-eval
    const OpsWrapper = eval(`(${(function OpsWrapper() {
        Reflect.apply(inherits, this, arguments)
    }).toString().replace('OpsWrapper', name)})`)

    OpsWrapper.__isContainer = isContainer || isContainerType(inherits)

    OpsWrapper.prototype = Object.assign(Object.create(inherits.prototype), {
        constructor: OpsWrapper,
        ...prototype,
    })

    return OpsWrapper
}

export function isContainerType(Type) {
    return Type?.__isContainer
}

export function isContainerInstance(node) {
    return isContainerType(node?.constructor)
}
