declare import scheme from 'lib/server/redis-util/scheme'
import { NavigateTemplateFn } from '../navigate'

type HashList = ReturnType<typeof scheme.hashList>

interface HashListApi {
    <T>(hashListFor: (query: {}) => HashList, param: string, template: NavigateTemplateFn<T>): NavigateTemplateFn<T>
}

declare const def: HashListApi
export default def
