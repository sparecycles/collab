import { IncomingMessage, OutgoingMessage } from 'http'
import { GetServerSideProps, NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import React from 'react'
import { Middleware } from 'swr'
export interface ApiHandler<Req, Res> {
    (
        req: NextApiRequest & Req,
        res: NextApiResponse & Res
    ): unknown | Promise<unknown>
}

export interface ApiMiddleware<Req, Res> {
    (
        req: NextApiRequest & Req,
        res: NextApiResponse & Res,
        next: NextApiHandler<unknown>
    ): unknown | Promise<unknown>
}

export interface MethodMap<ApiHandlerType> {
    $get?: ApiHandlerType
    $post?: ApiHandlerType
    $put?: ApiHandlerType
    $patch?: ApiHandlerType
    $delete?: ApiHandlerType
    $head?: ApiHandlerType
    $options?: ApiHandlerType
    $any?: ApiHandlerType
}

export type ArrayOrSingle<T> = T & T[]

export interface ApiMap<ReqExt = {}, Res = {},
    Req = ReqExt & { context: {} },
    HandlerType = ApiHandler<Req, Res>,
    MiddlewareType = ApiMiddleware<Req, Res>
> extends MethodMap<Req, Res, HandlerType> {
    $inherited: ArrayOrSingle<MiddlewareType & MethodMap<MiddlewareType>>
    $mixin: ArrayOrSingle<MiddlewareType & MethodMap<MiddlewareType>>
    $context: { [_:string]: ApiHandler<Req, Res> }
    [_:string]: ApiMap<Req, Res>
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
    api: ApiMap<?, ?>
    choice: SpaceChoice
    roles: { [policy:string]: string[] }
}

declare var spaces: { [type:string]: Space }

export default spaces
