import Cookies from 'cookies'
import spaces from 'lib/common/spaces'
import { getSession } from 'lib/server/session'
import userSessionSchema from 'lib/server/data/schemas/user-session'
import { handleWithApiMap } from 'lib/server/api/api-map'

/** @type {import('next').NextApiHandler} */
export default async function api(req, res) {
    let { space, path: queryPath = [] } = req.query

    const { session } = getSession(new Cookies(req, res), false)

    const type = await userSessionSchema.collab.spaces(space).$get('type')

    if (type == null) {
        return res.status(404).end()
    }

    try {
        if (!await handleWithApiMap(req, res, spaces[type].api, queryPath, { session })) {
            return res.status(404).end()
        }
    } catch (error) {
        console.error(`error calling space[${type}].api ${queryPath}`, error)
        return res.status(500).end()
    }
}
