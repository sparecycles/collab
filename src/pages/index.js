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
    Provider as SpectrumProvider,
    lightTheme,
    Flex,
} from '@adobe/react-spectrum'
import UserGroup from '@spectrum-icons/workflow/UserGroup'
import formParser from 'lib/server/form-parser'
import Head from 'next/head'
import Cookies from 'cookies'
import spaces from 'lib/common/spaces'
import { getSession } from 'lib/server/session'
import PropTypes from 'lib/common/react-util/prop-types'
import RedisContext from 'lib/server/redis-util/redis-context'
import commonSchema from 'lib/server/data/schemas/common-schema'

function spaceNameInvalid(space) {
    return /[^a-z0-9_-]/i.test(space)
}

async function generateUnusedSpaceName() {
    let space

    do {
        space = crypto.randomBytes(8).readBigUInt64BE().toString(36)
            .replace(/[l1i]/g, '')
            .replace(/[0]/g, '')
            .replace(/[5]/g, '')
            .slice(0, 5).toUpperCase()
    } while (await commonSchema.collab.spaces.$has(space))

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
                await commonSchema.collab.spaces(space).$watch()

                const type = await commonSchema.collab.spaces(space).$get('type')
                if (type) {
                    throw new WatchError(`space ${space} already exists`)
                }
            }).multi(async () => {
                await commonSchema.collab.spaces(space).$set({ type, 'creator-session': session })
            }).exec()

            return { redirect: { statusCode: 303, destination: `/s/${space}/register` } }
        } catch (ex) {
            res.statusCode = ex instanceof WatchError ? 409 : 400
            const message = ex instanceof WatchError ? ex.message : String(ex)

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
            { dismiss => (
                <SpectrumProvider theme={lightTheme}>
                    <AlertDialog variant={'warning'}
                        title={title}
                        primaryActionLabel={'Okay'}
                        onPrimaryAction={dismiss}>
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
                        { spaceTypes.map(({ key, icon: Icon, text, description }) => (
                            <Item key={key} textValue={text}>
                                <Icon/>
                                <Text>{text}</Text>
                                <Text slot={'description'}>{description}</Text>
                            </Item>
                        ))}
                    </Picker>
                    <Button type={'submit'}><UserGroup /><Text>Create Space</Text></Button>
                </Form>
            </Flex>
        </div>
    )
}
