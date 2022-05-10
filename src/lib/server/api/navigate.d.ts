import { ApiMap } from 'lib/common/spaces'

export interface NavigateTemplateFn {
    <TemplateMap>(
        node: TemplateMap,
        path: string[],
        options?: {
            escape?: (part: string) => string,
            collector?: (node: TemplateMap, last: boolean) => void
        }
    ): {
        node: any,
        path: string[],
        query: { [_:string]: string | string[] }
    }
}

const navigate: NavigateTemplateFn;

export default navigate;

