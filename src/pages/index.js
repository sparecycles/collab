import { useEffect, useState } from 'react'
import { WatchError } from 'redis'
import crypto from 'lib/server/node/crypto'
import {
    AlertDialog,
    Button,
    DialogTrigger,
    Form,
    Item,
    Picker,
    Text,
    TextField,
    Provider as SpectrumProvider,
    lightTheme,
    Flex,
} from '@adobe/react-spectrum'
import useSWR from 'swr'
import UserGroup from '@spectrum-icons/workflow/UserGroup'
import formParser from 'lib/server/form-parser'
import Head from 'next/head'
import Cookies from 'cookies'
import spaces from 'lib/common/spaces'
import { getSession } from 'lib/server/session'
import PropTypes from 'lib/common/react-util/prop-types'
import RedisContext from 'lib/server/redis-util/redis-context'
import userSessionSchema from 'lib/server/data/schemas/user-session'
import scheme from 'lib/server/redis-util/redis-scheme'

function spaceNameInvalid(space) {
    return /[^a-z0-9_-]/i.test(space)
}

async function simulateErrorConditionsCreatingASpace(space) {
    if (space.startsWith('error-')) {
        throw new Error(space.replace(/^error-/, ''))
    }

    if (space.startsWith('conflict-')) {
        await scheme.hash(userSessionSchema.spaces(space).$path()).$set({ type: 'conflict' })
    }
}

async function generateUnusedSpaceName() {
    let space

    do {
        space = crypto.randomBytes(8).readBigUInt64BE().toString(36)
            .replace(/[l1i]/g, '')
            .replace(/[0]/g, '')
            .replace(/[5]/g, '')
            .slice(0, 5).toUpperCase()
    } while (await userSessionSchema.spaces(space).$exists())

    return space
}

/** @type {import('next').GetServerSideProps} */
export async function getServerSideProps({ req, res }) {
    const { session, generated } = getSession(new Cookies(req, res))

    if (req.method === 'POST') {
        if (generated) {
            return { redirect: { destination: '?confirm-session' } }
        }

        let { type, space } = await formParser(req, res)

        if (spaceNameInvalid(space)) {
            return {
                props: { error: {
                    type: 'room:creation',
                    message: `illegal characters in space name: ${JSON.stringify(space)}`,
                } },
            }
        }

        // make sure we have a space name, generate an unused one
        space = space || await generateUnusedSpaceName()

        try {
            await RedisContext.isolated(async () => {
                userSessionSchema.spaces(space).$watch()

                const type = await userSessionSchema.spaces(space).$get('type')
                if (type) {
                    throw new WatchError(`space ${space} already exists`)
                }

                await simulateErrorConditionsCreatingASpace(space)
            }).multi(async () => {
                userSessionSchema.spaces(space).$set({ type, 'creator-session': session })
            }).exec()

            return { redirect: { statusCode: 303, destination: `/s/${space}/register` } }
        } catch (ex) {
            res.statusCode = ex instanceof WatchError ? 409 : 400
            const message = ex instanceof WatchError ? `space ${space} already exists` : String(ex)

            return {
                props: { error: { type: 'room:creation', message } },
            }
        }
    }

    const error = req.cookies['last-error']
    if (error !== undefined) {
        new Cookies(req, res).set('last-error')
    }

    if (error) {
        return { props: { error: { type: 'room:ejection', message: error } } }
    }

    return { props: {} }
}

const spaceTypes = Object.entries(spaces).map(([key, { choice }]) => ({ key, ...choice }))
    .sort(({ order: a, key: ka }, { order: b, key: kb }) =>
        a == null && b == null ? kb.localeCompare(ka) : // eslint-disable
        a == null ? +1 :
        b == null ? -1 :
        a === b ? kb.localeCompare(ka) :
        Math.sign(b - a))

const spaceTypesMap = spaceTypes.reduce((acc, type) => Object.assign(acc, { [type.key]: type }), {})

const ERROR_TYPES = {
    'room:creation': {
        heading: 'Failed to create a room',
        footing: 'Please try again',
    },
    'room:ejection': {
        heading: 'Room does not exist',
    },
}

ErrorDisplay.propTypes = {
    type: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
}

function ErrorDisplay({ type, message }) {
    const {
        title = 'Oh no!',
    } = ERROR_TYPES[type] || {}

    const [isOpen, setOpen] = useState(false)

    useEffect(() => {
        setOpen(true)
        const timeout = setTimeout(() => setOpen(false), 5000)
        return () => clearTimeout(timeout)
    }, [])

    return (
        <DialogTrigger isOpen={isOpen} onOpenChange={setOpen}>
            { <></> }
            {_close => (
                <SpectrumProvider theme={lightTheme}>
                    <AlertDialog variant={'warning'} title={title} primaryActionLabel={'Okay'}>
                        { message }
                    </AlertDialog>
                </SpectrumProvider>
            )}
        </DialogTrigger>
    )
}

Home.propTypes = {
    // eslint-disable-next-line
    error: PropTypes.any,
}

export default function Home({ error }) {
    const [type, setType] = useState(spaceTypes[0].key)

    const [space, setSpace] = useState('')

    const isSpaceNameInvalid = spaceNameInvalid(space)

    const { data: spaceExists } = useSWR(`${space} exists`, async () => {
        if (isSpaceNameInvalid || !space) {
            return false
        }

        const { status } = await fetch(`/api/s/${encodeURIComponent(space)}`)
        return status === 200
    })

    return (
        <div>
            <Head>
                <title>Create a Space</title>
                <meta name={'description'} content={''} />
                <link rel={'icon'} href={'/favicon.ico'} />
            </Head>

            <Flex direction={'column'} marginX={'auto'} marginTop={'size-1000'} maxWidth={'size-5000'}>
                { error ? <ErrorDisplay {...error}/> : [] }
                <Form minWidth={'size-3600'} encType={'application/x-www-form-urlencoded'} method={'post'}>
                    <Picker label={'Create a space'}
                        defaultSelectedKey={type}
                        onSelectionChange={setType}
                        description={spaceTypesMap[type].description}
                        name={'type'}
                    >
                        { spaceTypes.map(({ key, icon, text, description }) => (
                            <Item key={key} textValue={text}>
                                { icon || [] }
                                <Text>{text}</Text>
                                <Text slot={'description'}>{description}</Text>
                            </Item>
                        ))}
                    </Picker>
                    <TextField
                        isQuiet
                        minHeight={'size-1250'}
                        name={'space'}
                        label={'pick a space name (optional)'}
                        value={space}
                        onChange={setSpace}
                        description={'choose a custom name for your space or a random one will be generated'}
                        validationState={isSpaceNameInvalid || spaceExists ? 'invalid' : 'valid'}
                        errorMessage={isSpaceNameInvalid
                            ? `space name has invalid characters`
                            : `space ${space} already created`
                        }
                    />
                    <Button type={'submit'} isDisabled={spaceExists}><UserGroup /><Text>Create Space</Text></Button>
                </Form>
            </Flex>
        </div>
    )
}
