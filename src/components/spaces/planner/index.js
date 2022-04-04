import { Text } from '@adobe/react-spectrum'

export default function Planner() {
    return (
        <Text>Not Implemented Yet!</Text>
    )
}

/** @type {import('next').GetServerSideProps} */
export function getServerSideProps({ req, res, space, session, config, ...etc }) {
    return { props: { etc } }
}
