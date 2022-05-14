import Head from 'next/head'
import { Flex, Form, TextField, Text } from '@adobe/react-spectrum'

import Cookies from 'cookies'
import formParser from 'lib/server/form-parser'
import spaces from 'lib/common/spaces'
import { getSession } from 'lib/server/session'
import crypto from 'lib/server/node/crypto'
import PropTypes from 'lib/common/react-util/prop-types'
import userSessionSchema from 'lib/server/data/schemas/user-session'

const httpOnly = true

/** @type {import('next').GetServerSideProps} */
export async function getServerSideProps({ req, res, params: { space } }) {
    const cookies = new Cookies(req, res)

    const {
        type,
        'creator-session': creatorSession,
        ...config
    } = await userSessionSchema.spaces(space).$getAll()

    if (!type) {
        cookies.set('last-error', `space ${space} does not exist`, { httpOnly })
        return { redirect: { statusCode: 303, destination: `/` } }
    }

    const { session, generated } = getSession(cookies)

    if (req.method === 'POST') {
        await formParser(req, res)

        if (generated) {
            console.warn('register: trigger repost to ensure session id agreement')
            return { redirect: { destination: '?confirm-session' } }
        }

        const { username } = req.body

        if (username) {
            cookies.set('username', username, { maxAge: 60 * 60 * 24 * 7 })

            let user = await userSessionSchema.spaces(space).sessions(session).$get('user')

            if (user) {
                await userSessionSchema.spaces(space).users(user).$set({ username })
            } else {
                user = crypto.randomUUID()

                const { roles } = spaces[type]
                const initialRoles = session === creatorSession && roles.creator || roles.user || []

                await Promise.all([
                    userSessionSchema.spaces(space).users(user).$set({ username }),
                    userSessionSchema.spaces(space).sessions(session).$set({ user }),
                    userSessionSchema.spaces(space).sessions(session).roles().$add(initialRoles),
                ])
            }

            return { redirect: { statusCode: 303, destination: `/s/${space}` } }
        } else {
            console.warn('register: no username, fallthrough to display UI')
        }
    }

    return {
        props: {
            space,
            type,
            config,
            username: cookies.get('username') || null,
        },
    }
}

Space.propTypes = {
    username: PropTypes.string,
    type: PropTypes.string.isRequired,
}

export default function Space({ username, type }) {
    const { choice } = spaces[type]

    return (
        <div>
            <Head>
                <title>Register</title>
                <meta name={'description'} content={''} />
                <link rel={'icon'} href={'/favicon.ico'} />
            </Head>

            <Flex direction={'column'} gap={'size-200'} alignItems={'center'} margin={'size-200'}>
                { choice.icon }
                <Text>{ choice.text }</Text>
                <Form method={'post'}>
                    <TextField
                        label={'Pick your username'}
                        name={'username'}
                        necessityIndicator={'icon'}
                        defaultValue={username}
                        isRequired
                    />
                </Form>
            </Flex>
        </div>
    )
}

