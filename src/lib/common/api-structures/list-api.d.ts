declare import scheme from 'lib/server/redis-util/redis-scheme'
import { NavigateTemplateFn } from '../../server/api/navigate'

type HashList = ReturnType<typeof scheme.hashList>

interface HashListApi {
    <T>(hashListFor: (query: {}) => HashList, param: string, template: NavigateTemplateFn<T>): NavigateTemplateFn<T>
}

declare const def: HashListApi
export default def
