import Cookies from 'cookies'
import spaces from 'lib/common/spaces'
import methods from 'lib/server/api/methods'
import redisClient from 'lib/server/redis-client'
import { getSession } from 'lib/server/session'
import navigate from 'lib/server/util/navigate'

/** @type {import('next').NextApiHandler} */
export default async function api(req, res) {
    let { space, path: queryPath } = req.query

    const { session } = getSession(new Cookies(req, res), false)

    const type = await redisClient.hGet(`spaces:${space}:info`, 'type')

    if (type == null) {
        return res.status(404).end()
    }

    let { api, path, query } = navigate(spaces[type].api, queryPath)

    api = typeof api === 'function' ? api : methods(api)

    try {
        const enhancedReq = { ...req, query: { ...req.query, ...query, session, path } }

        return await api(enhancedReq, res)
    } catch (error) {
        console.error('error calling space api', error)
        return res.status(500).end()
    }
}
