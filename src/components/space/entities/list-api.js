import crypto from 'lib/server/node/crypto'
import redisClient from 'lib/server/redis-client'
import scheme from 'lib/server/redis-util/scheme'

/** @type {(path: (query:any)=>string, param: string, mixin: import('lib/common/spaces').ApiMap) => import('lib/common/spaces').ApiMap} */
export default function list(path, param, { [param]: paramMixin, ...mixin } = {}) {
    const paramName = /\[([a-z_$][a-z0-9_$]*)\]/i.exec(param)?.[1]

    if (!paramName) {
        throw new Error(`expected param to look like "[name]", got ${JSON.stringify(param)}`)
    }

    return {
        async get({ query }, res) {
            const stories = await scheme.hashList(`${path(query)}`).allItems()

            return res.json(stories)
        },
        async post({ body, query }, res) {
            const { id = crypto.randomUUID(), title } = body

            await scheme.hashList(`${path(query)}`).addItem(id, { title })

            return res.json({ id })
        },
        ...mixin,
        [param]: {
            async del({ query: { [paramName]: param, ...query } }, res) {
                await scheme.hashList(`${path(query)}`).remItem(param)
                return res.status(204).end(param)
            },
            async get({ query: { [paramName]: param, ...query } }, res) {
                return res.json(await redisClient.hGetAll(`${path(query)}:${param}`))
            },
            async put({ body, query: { [paramName]: param, ...query } }, res) {
                return res.json(await redisClient.hSet(`${path(query)}:${param}`, body))
            },
            ...paramMixin,
        },
    }
}
