/** @type {import('./navigate').NavigateTemplateFn} */
export default function navigate(
    node,
    path,
    {
        collector = Function.prototype,
    } = {}
) {
    const query = {}

    path = [...path]

    while (node && typeof node !== 'function' && path.length > 0) {
        // escape leading $, [ or / characters with a /
        const nextApi = node[path[0].replace(/^([[\/$])/, `/$1`)]

        collector(node)

        if (nextApi && typeof nextApi === 'object') {
            node = nextApi
            path.shift()
            continue
        }

        const genericPathKey = Object.keys(node).find(key => key.startsWith('[...') && key.endsWith(']'))

        if (genericPathKey) {
            const queryKey = genericPathKey.slice(4, -1)
            query[queryKey] = path
            node = node[genericPathKey]
            path.splice(0, path.length)
            continue
        }

        const genericKey = Object.keys(node).find(key => key.startsWith('[') && key.endsWith(']'))

        if (genericKey) {
            const queryKey = genericKey.slice(1, -1)
            query[queryKey] = path[0]
            node = node[genericKey]
            path.shift()
            continue
        }

        break
    }

    collector(node, true)

    return { node, path, query }
}
