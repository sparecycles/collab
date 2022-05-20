import Cookies from 'cookies'
import xferScheme from 'lib/server/data/schemas/xfer-scheme'
import userSessionSchema from 'lib/server/data/schemas/user-session'
import crypto from 'lib/server/node/crypto'
import { getSession } from 'lib/server/session'
import methods, { _404 } from 'lib/server/api/methods'

/** @type {import('next').NextApiHandler} */
export default methods({
    async $post(req, res) {
        const cookies = new Cookies(req, res)

        const { method, body } = req

        /** @type {{ space: string }} */
        const { space } = body
        /** @type {{ session: string }} */
        const { session, generated } = getSession(cookies)

        const roles = await userSessionSchema.collab.spaces(space).sessions(session).roles.$get()

        if (generated) {
            return { redirect: { destination: '?session-confirmation' } }
        }

        const xfer = crypto.randomUUID()

        await xferScheme.collab.xfer(xfer).$set({ space, session, roles: [...roles].join(',') })
        await xferScheme.collab.xfer(xfer).$expire(120)

        return res.json({ xfer })
    },
}, _404)
