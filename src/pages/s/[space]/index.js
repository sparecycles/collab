import React, { Fragment } from 'react'
import Head from 'next/head'
import spaces from 'lib/common/spaces'
import redisClient from 'lib/server/redis-client'
import Cookies from 'cookies'
import SpaceContext from 'components/space/SpaceContext'
import { getSession } from 'lib/server/session'
import PropTypes from 'lib/common/react-util/prop-types'
import userSessionSchema from 'lib/server/data/schemas/user-session'

/** @type {import('next').GetServerSideProps} */
export async function getServerSideProps({ req, res, params: { space }, ...other }) {
    const cookies = new Cookies(req, res)

    const { type, ...config } = await redisClient.hGetAll(`spaces:${space}:info`)

    if (!type) {
        cookies.set('last-error', `space ${space} does not exist`)
        return { redirect: { statusCode: 303, destination: `/` } }
    }

    const { session } = getSession(cookies)

    const [user, roles] = await Promise.all([
        userSessionSchema.spaces(space).sessions(session).info().get('user'),
        userSessionSchema.spaces(space).sessions(session).roles().getMembers(),
    ])

    const userinfo = await userSessionSchema.spaces(space).users().item(user).getAll()

    if (!userinfo.username) {
        return { redirect: { destination: `/s/${space}/register` } }
    }

    const { props = {} } = await (spaces[type].getServerSideProps || Function.prototype)({
        req, res, ...other, params: { space, session, user, config },
    }) || {}

    return {
        props: {
            ...props,
            type,
            space,
            user,
            roles: roles || [],
            userinfo,
            config,
        },
    }
}

Space.propTypes = {
    pageTitle: PropTypes.string,
    type: PropTypes.string.isRequired,
}

export default function Space({ pageTitle, type, ...props }) {
    const { Component } = spaces[type]

    return (
        <Fragment>
            <Head>
                <title>{pageTitle}</title>
                <meta name={'description'} content={''} />
                <link rel={'icon'} href={'/favicon.ico'} />
            </Head>

            <SpaceContext.Provider value={{ type, ...props }}>
                <Component {...props} />
            </SpaceContext.Provider>
        </Fragment>
    )
}
