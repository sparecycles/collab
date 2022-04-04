
export function rekey(object, fn) {
    return Object.entries(object).reduce((acc, [k, v]) => Object.assign(acc, { [fn(k)]: v }), {})
}
