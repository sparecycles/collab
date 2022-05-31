import Question from '@spectrum-icons/workflow/Question'
import React from 'react'

import * as voter from 'components/spaces/voter'
import * as planner from 'components/spaces/planner'

export default mapImports({
    voter,
    planner,
})

function mapImports(obj) {
    return Object.entries(obj).reduce((imports, [k, v]) => Object.assign(imports, {
        [k]: mapImport(k, v),
    }), {})
}

function mapImport(type, {
    default: Component,
    getServerSideProps,
    api = {},
    choice = {},
    initialRoles = {
        user: ['user'],
        creator: ['user', 'creator'],
    },
}) {
    if (typeof Component !== 'function' && !(Component instanceof React.Component)) {
        throw new Error(
            `spaces: ${type}: default export not a component for space ${type}`)
    }

    choice = Object.assign({
        icon: Question,
        text: type,
        description: `Create a ${type} space`,
    }, choice)

    return {
        Component,
        getServerSideProps,
        api,
        choice,
        initialRoles,
    }
}
