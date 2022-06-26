import {
    useRef, useState,
} from 'react'

import {
    Button, Flex, Form, TextField,
} from '@adobe/react-spectrum'

import { useEditListItemFormSubmit } from 'lib/client/data/util/list-data'
import PropTypes from 'lib/common/react-util/prop-types'

AddStoryForm.propTypes = {
    afterMutate: PropTypes.func,
    title: PropTypes.string,
}

export default function AddStoryForm({
    afterMutate = Function.prototype,
    title: initialTitle = '',
    ...props
}) {
    const [title, setTitle] = useState(initialTitle)
    const form = useRef()
    const field = useRef()

    const { onSubmit } = useEditListItemFormSubmit('stories', {
        validate({ title }) {
            return Boolean(title)
        },
        afterMutate() {
            setTitle('')
            afterMutate()
        },
    })

    return (
        <Form ref={form} isQuiet onSubmit={onSubmit}>
            <Flex direction={'row'}>
                <TextField ref={field}
                    flex
                    aria-label={'Story Title'}
                    description={'Add Story for Grooming'}
                    name={'title'}
                    onChange={setTitle}
                    value={title}
                    {...props}
                />
                <Button type='submit' variant='primary' isQuiet>{'Add Story'}</Button>
            </Flex>
        </Form>
    )
}
