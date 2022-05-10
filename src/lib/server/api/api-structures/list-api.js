import crypto from 'lib/server/node/crypto'

/** @type {import('./list-api').default} */
export default function hashList(hashListFor, param, { [param]: paramMixin, ...mixin } = {}) {
    const paramName = /\[([a-z_$][a-z0-9_$]*)\]/i.exec(param)?.[1]

    if (!paramName) {
        throw new Error(`expected param to look like "[name]", got ${JSON.stringify(param)}`)
    }

    return {
        async $get({ query }, res) {
            const list = await hashListFor(query).allItems()

            return res.json(list)
        },
        async $post({ body, query }, res) {
            const { id = crypto.randomUUID(), title } = body

            await hashListFor(query).addItem(id, { title })

            return res.json({ id })
        },
        ...mixin,
        [param]: {
            async $delete({ query: { [paramName]: param, ...query } }, res) {
                await hashListFor(query).remItem(param)
                return res.status(204).end(param)
            },
            async $get({ query: { [paramName]: param, ...query } }, res) {
                return res.json(await hashListFor(query).getItem(param))
            },
            async $put({ body, query: { [paramName]: param, ...query } }, res) {
                return res.json(await hashListFor(query).updateItem(param, body))
            },
            ...paramMixin,
        },
    }
}
