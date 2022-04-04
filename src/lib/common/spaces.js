/**
 * import space types in /components/spaces
 */
import Question from '@spectrum-icons/workflow/Question'
import React from 'react'

const req = require.context('components/spaces', true, /components[/]spaces[/][^/]+(?:[/]|[.]js)$/)

function mapImport(path, {
    default: Component,
    getServerSideProps,
    api = {},
    choice = {},
    roles = {
        user: ['user'],
        creator: ['user', 'creator'],
    },
}) {
    const type = spaceType(path)

    if (typeof Component !== 'function' && !(Component instanceof React.Component)) {
        throw new Error(
            `spaces: ${path}: default export not a component for space ${type}`)
    }

    choice = Object.assign({
        icon: (<Question size={'XL'}/>),
        text: type,
        description: `Create a ${type} space`,
    }, choice)

    return {
        Component,
        getServerSideProps,
        api,
        choice,
        roles,
    }
}

function spaceType(requirePath) {
    return requirePath.replace(/^components[/]spaces[/]/, '').replace(/(?:[/]|[.]js)$/, '')
}

export default req.keys()
    .filter(r => r !== 'components/spaces/index.js')
    .reduce((spaces, r) => Object.assign(spaces, {
        [spaceType(r)]: mapImport(r, req(r)),
    }), {})
