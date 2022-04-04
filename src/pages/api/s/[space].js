import Cookies from 'cookies'
import { loadCurrentUser, loadUserInfo } from 'lib/server/data/user-data'
import methods from 'lib/server/api/methods'
import { getSession } from 'lib/server/session'
import userSessionSchema from 'lib/server/data/schemas/user-session'

export default methods({
    async get(req, res) {
        const { session } = getSession(new Cookies(req, res), false)

        const { query: { space } } = req

        const rolesRequest = userSessionSchema.spaces(space).sessions(session).roles().getMembers()

        const configRequest = userSessionSchema.spaces(space).info().getAll()

        const user = await loadCurrentUser({ space, session })

        const userinfo = await loadUserInfo({ space, user })

        const { type } = await configRequest

        if (type) {
            return res.json({
                config: { type },
                roles: await rolesRequest,
                user,
                users: { [user]: userinfo },
            })
        }

        return res.status(404).end()
    },
})
