import crypto from 'lib/server/node/crypto'

/** @type {import('./list-api').default} */
export default function hashList(hashListFor, param, { [param]: paramMixin, ...mixin } = {}) {
    const paramName = /\[([a-z_$][a-z0-9_$]*)\]/i.exec(param)?.[1]

    if (!paramName) {
        throw new Error(`expected param to look like "[name]", got ${JSON.stringify(param)}`)
    }

    return {
        async $get({ query }, res) {
            const list = await hashListFor(query).$items()

            return res.json(list)
        },
        async $post({ body, query }, res) {
            /** @type {{[_:string]: string}} */
            const { id = crypto.randomUUID(), ...data } = body

            await hashListFor(query)(id).$set({ ...data })

            return res.json({ id })
        },
        ...mixin,
        [param]: {
            async $delete({ query: { [paramName]: param, ...query } }, res) {
                await hashListFor(query)(param).$del()
                return res.status(204).end(param)
            },
            async $get({ query: { [paramName]: param, ...query } }, res) {
                return res.json(await hashListFor(query)(param).$get())
            },
            async $put({ body, query: { [paramName]: param, ...query } }, res) {
                return res.json(await hashListFor(query)(param).$set(body))
            },
            ...paramMixin,
        },
    }
}
