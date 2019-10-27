import { IsoError } from 'iso-error'
import { SpecPlugin } from '../spec'

export const errorPlugin: SpecPlugin<Error, Record<string, any>> = {
  name: 'error',
  support: subject => subject instanceof Error,
  createSpy: (_, subject) => subject,
  createStub: (_, _subject, meta) => {
    return IsoError.fromSerializable(meta)
  },
  metarize: (_, spy) => {
    return IsoError.toSerializable(spy)
  },
}
