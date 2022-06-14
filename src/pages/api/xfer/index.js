import Cookies from 'cookies'

import methods, { _404 } from 'lib/server/api/methods'
import commonSchema from 'lib/server/data/schemas/common-schema'
import xferScheme from 'lib/server/data/schemas/xfer-schema'
import crypto from 'lib/server/node/crypto'
import { getSession } from 'lib/server/session'

/** @type {import('next').NextApiHandler} */
export default methods({
    async $post(req, res) {
        const cookies = new Cookies(req, res)

        const { body } = req

        /** @type {{ space: string }} */
        const { space } = body
        /** @type {{ session: string }} */
        const { session, generated } = getSession(cookies)

        const user = await commonSchema.collab.spaces(space).sessions(session).$get('user')
        const roles = await commonSchema.collab.spaces(space).users(user).roles.$get()

        if (generated) {
            return { redirect: { destination: '?session-confirmation' } }
        }

        const xfer = crypto.randomUUID()

        await xferScheme.collab.xfer(xfer).$set({ space, session, roles: [...roles].join(',') })
        await xferScheme.collab.xfer(xfer).$expire(120)

        return res.json({ xfer })
    },
}, _404)
