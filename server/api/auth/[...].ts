import { auth } from '@@/lib/auth'
import { toWebRequest } from 'h3' // Use h3 utility
export default defineEventHandler(async (event) => {
  // The auth.handler expects a standard Request object
  return auth.handler(toWebRequest(event))
})
