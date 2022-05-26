import React, { Fragment } from 'react'
import Head from 'next/head'
import spaces from 'lib/common/spaces'
import Cookies from 'cookies'
import SpaceContext from 'components/space/SpaceContext'
import { getSession } from 'lib/server/session'
import PropTypes from 'lib/common/react-util/prop-types'
import commonSchema from 'lib/server/data/schemas/common-schema'
import GeneralControls from 'components/space/GeneralControls'

/** @type {import('next').GetServerSideProps} */
export async function getServerSideProps({ req, res, params: { space }, ...other }) {
    const cookies = new Cookies(req, res)

    const { type, ...config } = await commonSchema.collab.spaces(space).$get()

    if (!type) {
        cookies.set('last-error', `space ${space} does not exist`)
        return { redirect: { statusCode: 303, destination: `/` } }
    }

    if (!spaces[type]) {
        cookies.set('last-error', `space ${space} is not configured (type=${type} is wrong)`)
        return { redirect: { statusCode: 303, destination: `/` } }
    }

    const { session } = getSession(cookies)

    const user = await commonSchema.collab.spaces(space).sessions(session).$get('user')
    const [roles, userinfo] = await Promise.all([
        commonSchema.collab.spaces(space).users(user).roles.$get(),
        user ? commonSchema.collab.spaces(space).users(user).$get() : {},
    ])

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
            roles: [...roles],
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
                <GeneralControls position='fixed' bottom='size-100' right='size-100' user={user} />
                <Component {...spaceProps} />
            </SpaceContext.Provider>
        </Fragment>
    )
}
