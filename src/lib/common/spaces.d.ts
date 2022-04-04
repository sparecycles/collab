import { GetServerSideProps, NextApiHandler } from 'next'
import React from 'react'

export interface ApiMap {
    [_:string]: ApiMap,
    get?: NextApiHandler<any> | ApiMap,
    post?: NextApiHandler<any> | ApiMap,
    put?: NextApiHandler<any> | ApiMap,
    patch?: NextApiHandler<any> | ApiMap,
    del?: NextApiHandler<any> | ApiMap,
    head?: NextApiHandler<any> | ApiMap,
    options?: NextApiHandler<any> | ApiMap,
    any?: NextApiHandler<any> | ApiMap,
}

export type SpaceChoice = {
    icon?: JSX.Element
    text: string | JSX.Element
    description?: string | JSX.Element
    order?: number
}

export type Space = {
    Component: React.Component | React.FunctionComponent
    getServerSideProps: GetServerSideProps
    api: ApiMap
    choice: SpaceChoice,
    roles: { [policy:string]: string[] }
}

declare var spaces: { [type:string]: Space }

export default spaces
