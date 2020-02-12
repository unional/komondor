import { enableLog } from './enableLog'
import { Spec } from './types'

export async function createLiveSpec(): Promise<Spec> {
  return Object.assign(async (subject: any) => subject, {
    async done() { },
    enableLog,
    getSpecRecord: () => ({ refs: [], actions: [] }),
  })
}
