/** @type {(api: import('lib/common/spaces').ApiMap, path: string[]) => { api: any, path: string[], query: {[_:string]: string|string[]} }} */
export default function navigate(api, path) {
    const query = {}

    path = path.slice()

    while (api && typeof api !== 'function' && path.length > 0) {
        // escape leading [ or / characters with a /
        const nextApi = api[path[0].replace(/^[\[\/]/, '/$0')]

        if (typeof nextApi === 'object') {
            api = nextApi
            path.shift()
            continue
        }

        const genericPathKey = Object.keys(api).find(key => key.startsWith('[...') && key.endsWith(']'))

        if (genericPathKey) {
            const queryKey = genericPathKey.slice(4, -1)
            query[queryKey] = path
            api = api[genericPathKey]
            path.splice(0, path.length)
            continue
        }

        const genericKey = Object.keys(api).find(key => key.startsWith('[') && key.endsWith(']'))

        if (genericKey) {
            const queryKey = genericKey.slice(1, -1)
            query[queryKey] = path[0]
            api = api[genericKey]
            path.shift()
            continue
        }

        break
    }

    return { api, path, query }
}

export function recollect(flatObject, template, res = {}) {
    for (const [k, v] of Object.entries(flatObject)) {
        const { api, path, query } = navigate(template, k.split(':'))
        if (typeof api !== 'function') {
            console.warn(`unhandled response data: ${k}:`, path, query)
            continue
        }
        api({ data: v, query: { ...query, path } }, res)
    }

    return res
}
