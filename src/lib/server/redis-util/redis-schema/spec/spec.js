import { createSpec } from './spec-core/ops-spec'

import { HashOps } from './hash-ops'
import { KeyOps } from './key-ops'
import { RangeOps } from './range-ops'
import { SetOps } from './set-ops'

export const spec = {
    key(...children) { return createSpec(KeyOps, children) },
    set(...children) { return createSpec(SetOps, children) },
    hash(...children) { return createSpec(HashOps, children) },
    range(...children) { return createSpec(RangeOps, children) },
}
