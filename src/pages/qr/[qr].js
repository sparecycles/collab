import Cookies from 'cookies'
import userSessionSchema from 'lib/server/data/schemas/user-session'
import redisClient from 'lib/server/redis-client'
import { getSession } from 'lib/server/session'

const httpOnly = true

/** @type {import('next').GetServerSideProps} */
export async function getServerSideProps({ req, res, params: { qr } }) {
    const cookies = new Cookies(req, res)

    const { space, session: originalSession } = await redisClient.hGetAll(`collab:qr:${qr}`)

    const { session, generated } = getSession(cookies)

    if (generated) {
        return { redirect: { destination: '?session-confirmation' } }
    }

    if (!session) {
        cookies.set('last-error', 'invalid qr', { httpOnly })
        return { redirect: { destination: '/' } }
    }

    const user = await userSessionSchema.spaces(space).sessions(originalSession).$get('user')
    await userSessionSchema.spaces(space).sessions(session).$set({ user })

    return { redirect: { destination: `s/${space}` } }
}

export default function Qr() {
    return
}
