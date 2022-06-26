import { useRef } from 'react'

import {
    Button,
    ButtonGroup,
    Content,
    Dialog,
    Form,
    Heading,
    TextField,
    useDialogContainer,
} from '@adobe/react-spectrum'
import { useLayoutEffect } from '@react-aria/utils'
import { unwrapDOMRef } from '@react-spectrum/utils'

import { useEditListItemFormSubmit } from 'lib/client/data/util/list-data'
import PropTypes from 'lib/common/react-util/prop-types'

EditStoryDialog.propTypes = {
    story: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
}

export default function EditStoryDialog({ story, title }) {
    const { dismiss } = useDialogContainer()
    const { onSubmit } = useEditListItemFormSubmit('stories', {
        id: story,
        validate({ title }) { return Boolean(title) },
        afterMutate() { dismiss() },
    })

    const textfield = useRef()
    const form = useRef()

    useLayoutEffect(() => {
        textfield?.current?.focus?.()
    }, [textfield])

    return (
        <Dialog>
            <Heading>Edit Story Title</Heading>
            <Content>
                <Form ref={form} onSubmit={(event) => {
                    onSubmit(event)
                    dismiss()
                }}>
                    <TextField ref={textfield} name={'title'} defaultValue={title} />
                </Form>
            </Content>
            <ButtonGroup>
                <Button variant='cta' onPress={event => fakeSubmit(event, form)}>Save</Button>
                <Button variant='secondary' onPress={dismiss}>Cancel</Button>
            </ButtonGroup>
        </Dialog>
    )
}


function fakeSubmit(event, formref) {
    unwrapDOMRef(formref).current.dispatchEvent(new SubmitEvent('submit', {
        submitter: event.target,
        bubbles: true,
        cancelable: true,
    }))
}
