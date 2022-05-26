import Head from 'next/head'
import { Flex, Form, TextField, Text } from '@adobe/react-spectrum'

import Cookies from 'cookies'
import formParser from 'lib/server/form-parser'
import spaces from 'lib/common/spaces'
import { getSession } from 'lib/server/session'
import crypto from 'lib/server/node/crypto'
import PropTypes from 'lib/common/react-util/prop-types'
import commonSchema from 'lib/server/data/schemas/common-schema'
import RedisContext from 'lib/server/redis-util/redis-context'

const httpOnly = true

/** @type {import('next').GetServerSideProps} */
export async function getServerSideProps({ req, res, params: { space } }) {
    const cookies = new Cookies(req, res)

    const {
        type,
        'creator-session': creatorSession,
        ...config
    } = await commonSchema.collab.spaces(space).$get()

    if (!type) {
        cookies.set('last-error', `space ${space} does not exist`, { httpOnly })
        return { redirect: { statusCode: 303, destination: `/` } }
    }

    if (!spaces[type]) {
        cookies.set('last-error', `space ${space} is not configured (type=${type} is wrong)`)
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

            let user = await commonSchema.collab.spaces(space).sessions(session).$get('user')
            if (user && !await commonSchema.collab.spaces(space).users.$has(user)) {
                user = null
            }

            if (user) {
                await commonSchema.collab.spaces(space).users(user).$set({ username })
            } else {
                user = crypto.randomUUID()

                const { roles } = spaces[type]
                const initialRoles = session === creatorSession && roles.creator || roles.user || []

                await RedisContext.multi(() => {
                    commonSchema.collab.spaces(space).sessions(session).$set({ user })
                    commonSchema.collab.spaces(space).users(user).$set({ username })
                    commonSchema.collab.spaces(space).users(user).roles.$add(initialRoles)
                })
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
    const { choice: { icon: Icon, text } } = spaces[type]

    return (
        <div>
            <Head>
                <title>Register</title>
                <meta name={'description'} content={''} />
                <link rel={'icon'} href={'/favicon.ico'} />
            </Head>

            <Flex direction={'column'} gap={'size-200'} alignItems={'center'} margin={'size-200'}>
                <Icon/>
                <Text>{ text }</Text>
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

