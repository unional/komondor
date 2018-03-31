import { createSatisfier } from 'satisfier'

import { SimulationMismatch, StubContext } from 'komondor-plugin'

export function stubClass(context: StubContext, subject) {
  const stubClass = class extends subject {
    // tslint:disable-next-line:variable-name
    __komondorStub: any = { methods: {} }
    constructor(...args) {
      // @ts-ignore
      super(...args)
      this.__komondorStub.ctorArgs = args

      const action = context.peek()
      console.log('class constructor', action, args)
      if (!action || !createSatisfier(action.payload).test(JSON.parse(JSON.stringify(args)))) {
        throw new SimulationMismatch(context.specId, 'class/constructor', action)
      }
      context.next()
    }
  }

  for (let p in stubClass.prototype) {
    stubClass.prototype[p] = function (...args) {
      const call = context.newCall()
      call.invoked(args, { methodName: p })

      if (call.succeed()) {
        return call.result()
      }
      if (call.failed()) {
        throw call.thrown()
      }
    }
  }
  return stubClass
}
