/** Client auth helpers for cookie sessions. */

import { ApiError, getMe } from './api/client'
import type { User } from './api/types'

/** Load the cookied profile, or null when not signed in. */
export async function loadMe(): Promise<User | null> {
  try {
    return await getMe()
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null
    }
    throw err
  }
}
