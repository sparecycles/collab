import Cookies from 'cookies'
import spaces from 'lib/common/spaces'
import methods from 'lib/server/api/methods'
import redisClient from 'lib/server/redis-client'
import { getSession } from 'lib/server/session'
import navigate from 'lib/server/api/navigate'
import composeMiddleware from 'lib/server/api/compose-middleware'

const composedApiSymbol = Symbol('composed-api')

function composed({ context, cache }, apiHandler, ...middleware) {
    return cache[composedApiSymbol] ?? (
        cache[composedApiSymbol] = composeMiddleware({ context }, ...middleware, apiHandler)
    )
}

/** @type {import('next').NextApiHandler} */
export default async function api(req, res) {
    let { space, path: queryPath } = req.query

    const { session } = getSession(new Cookies(req, res), false)

    const type = await redisClient.hGet(`spaces:${space}:info`, 'type')

    if (type == null) {
        return res.status(404).end()
    }

    const middleware = []
    const context = {}

    let { node: api, path, query } = navigate(spaces[type].api, queryPath, {
        collector: ({ $inherited, $mixin: $hereware, $context }, here) => {
            middleware.push(...[$inherited || [], ...here && $hereware || []].flat())
            Object.assign(context, $context || {})
        },
    })

    const apiHandler = typeof api === 'function' ? api : methods(api)

    if (!apiHandler) {
        return res.status(404).end()
    }

    try {
        const enhancedReq = { ...req, query: { ...req.query, ...query, session, path } }

        return await composed({ context, cache: api }, apiHandler, ...middleware)(enhancedReq, res)
    } catch (error) {
        console.error('error calling space api', error)
        return res.status(500).end()
    }
}
