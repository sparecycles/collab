import Cookies from 'cookies'

import methods from 'lib/server/api/methods'
import commonSchema from 'lib/server/data/schemas/common-schema'
import { getSession } from 'lib/server/session'

import { default as pathApi } from './[...path]'

export default methods({
    $any(req, res) {
        return pathApi(req, res)
    },
    async $get(req, res) {
        const { session } = getSession(new Cookies(req, res), false)

        const { query: { space } } = req

        const userAsync = commonSchema.collab.spaces(space).sessions(session).$get('user')

        const [user, { type }, roles, userinfo] = await Promise.all([
            userAsync,
            commonSchema.collab.spaces(space).$get(),
            userAsync.then(user =>
                commonSchema.collab.spaces(space).users(user).roles.$get()),
            userAsync.then(user =>
                user && commonSchema.collab.spaces(space).users(user).$get()),
        ])

        if (type) {
            return res.json({
                config: { type },
                roles,
                user,
                ...user ? { userinfo: { [user]: userinfo } } : { },
            })
        }

        return res.status(404).end()
    },
})
