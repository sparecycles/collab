import Cookies from 'cookies'
import xferScheme from 'lib/server/data/schemas/xfer-scheme'
import userSessionSchema from 'lib/server/data/schemas/user-session'
import { getSession } from 'lib/server/session'

const httpOnly = true

/** @type {import('next').GetServerSideProps} */
export async function getServerSideProps({ req, res, params: { xfer } }) {
    const cookies = new Cookies(req, res)

    const { space, session: originalSession } = await xferScheme.xfer(xfer).$getAll()

    const { session, generated } = getSession(cookies)

    if (generated) {
        return { redirect: { destination: '?session-confirmation' } }
    }

    if (!originalSession) {
        cookies.set('last-error', 'invalid xfer code', { httpOnly })
        return { redirect: { destination: '/' } }
    }

    const user = await userSessionSchema.spaces(space).sessions(originalSession).$get('user')
    await userSessionSchema.spaces(space).sessions(session).$set({ user })

    xferScheme.xfer(xfer).$expire(1)

    return { redirect: { destination: `/s/${space}` } }
}

export default function Qr() {
    return
}
