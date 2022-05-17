import React, { Fragment } from 'react'
import Head from 'next/head'
import spaces from 'lib/common/spaces'
import Cookies from 'cookies'
import SpaceContext from 'components/space/SpaceContext'
import { getSession } from 'lib/server/session'
import PropTypes from 'lib/common/react-util/prop-types'
import userSessionSchema from 'lib/server/data/schemas/user-session'
import UserControls from 'components/space/UserControls'

/** @type {import('next').GetServerSideProps} */
export async function getServerSideProps({ req, res, params: { space }, ...other }) {
    const cookies = new Cookies(req, res)

    const { type, ...config } = await userSessionSchema.spaces(space).$getAll()

    if (!type) {
        cookies.set('last-error', `space ${space} does not exist`)
        return { redirect: { statusCode: 303, destination: `/` } }
    }

    if (!spaces[type]) {
        cookies.set('last-error', `space ${space} is not configured (type=${type} is wrong)`)
        return { redirect: { statusCode: 303, destination: `/` } }
    }

    const { session } = getSession(cookies)

    const [user, roles] = await Promise.all([
        userSessionSchema.spaces(space).sessions(session).$get('user'),
        userSessionSchema.spaces(space).sessions(session).roles().$members(),
    ])

    const userinfo = user ? await userSessionSchema.spaces(space).users(user).$getAll() : {}

    if (!userinfo.username) {
        return { redirect: { destination: `/s/${space}/register` } }
    }

    const { props = {} } = await (spaces[type].getServerSideProps || Function.prototype)({
        req, res, ...other, params: { space, session, user, roles, config },
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
    user: PropTypes.string.isRequired,
    roles: PropTypes.arrayOf(PropTypes.string).isRequired,
}

export default function Space({ pageTitle, type, user, roles, ...props }) {
    const { Component } = spaces[type]

    const spaceProps = { user, roles: new Set(roles), ...props }

    return (
        <Fragment>
            <Head>
                <title>{pageTitle}</title>
                <meta name={'description'} content={''} />
                <link rel={'icon'} href={'/favicon.ico'} />
            </Head>

            <SpaceContext.Provider value={{ type, ...spaceProps }}>
                <UserControls position='fixed' bottom='size-100' right='size-100' user={user} />
                <Component {...spaceProps} />
            </SpaceContext.Provider>
        </Fragment>
    )
}
