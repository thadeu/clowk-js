import { useMemo } from 'react'
import { ClowkClient } from '@clowk/core'
import type { ClowkClientOptions } from '@clowk/core'

export function useClowk(options?: ClowkClientOptions): ClowkClient {
  return useMemo(() => new ClowkClient(options), [options])
}
