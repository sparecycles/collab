import Cookies from 'cookies'
import xferScheme from 'lib/server/data/schemas/xfer-schema'
import commonSchema from 'lib/server/data/schemas/common-schema'
import { getSession } from 'lib/server/session'

const httpOnly = true

/** @type {import('next').GetServerSideProps} */
export async function getServerSideProps({ req, res, params: { xfer } }) {
    const cookies = new Cookies(req, res)

    const { space, session: originalSession } = await xferScheme.collab.xfer(xfer).$get()

    const { session, generated } = getSession(cookies)

    if (generated) {
        return { redirect: { destination: '?session-confirmation' } }
    }

    if (!originalSession) {
        cookies.set('last-error', 'invalid xfer code', { httpOnly })
        return { redirect: { destination: '/' } }
    }

    const user = await commonSchema.collab.spaces(space).sessions(originalSession).$get('user')
    await commonSchema.collab.spaces(space).sessions(session).$set({ user })

    xferScheme.collab.xfer(xfer).$expire(1)

    return { redirect: { destination: `/s/${space}` } }
}

export default function Qr() {
    return
}
