import { Registrar, createExpectation, SpyContext, StubContext } from 'komondor-plugin'

import { isPromise } from './isPromise'

const TYPE = 'promise'

export function promiseConstructed() {
  return { type: TYPE, name: 'construct' }
}
export const promiseResolved = createExpectation(TYPE, 'return', { state: 'fulfilled' })
export const promiseRejected = createExpectation(TYPE, 'return', { state: 'rejected' })

export function activate(registrar: Registrar) {
  registrar.register(
    TYPE,
    isPromise,
    getPromiseSpy,
    getPromiseStub
  )
}

function getPromiseSpy(context: SpyContext, subject) {
  const instance = context.newInstance()
  const call = instance.newCall()
  return subject.then(
    result => call.return(result, { state: 'fulfilled' }),
    err => { throw call.return(err, { state: 'rejected' }) })
}

function getPromiseStub(context: StubContext) {
  const instance = context.newInstance()
  const call = instance.newCall()
  return new Promise((resolve, reject) => {
    call.waitUntilReturn(() => {
      if (call.succeed({ state: 'fulfilled' })) {
        resolve(call.result())
      }
      else {
        reject(call.thrown())
      }
    })
  })
}
