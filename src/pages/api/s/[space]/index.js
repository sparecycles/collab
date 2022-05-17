import Cookies from 'cookies'
import methods from 'lib/server/api/methods'
import { getSession } from 'lib/server/session'
import userSessionSchema from 'lib/server/data/schemas/user-session'

import { default as pathApi } from './[...path]'

export default methods({
    $any(req, res) {
        return pathApi(req, res)
    },
    async $get(req, res) {
        const { session } = getSession(new Cookies(req, res), false)

        const { query: { space } } = req

        const rolesRequest = userSessionSchema.spaces(space).sessions(session).roles().$members()

        const configRequest = userSessionSchema.spaces(space).$getAll()

        const user = await userSessionSchema.spaces(space).sessions(session).$get('user')

        const userinfo = user && await userSessionSchema.spaces(space).users(user).$getAll()

        const { type } = await configRequest

        if (type) {
            return res.json({
                config: { type },
                roles: await rolesRequest,
                user,
                ...user ? { userinfo: { [user]: userinfo } } : { },
            })
        }

        return res.status(404).end()
    },
})
