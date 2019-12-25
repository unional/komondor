import { SpecPlugin } from '../spec';
import { hasProperty, hasPropertyInPrototype, metarize, demetarize } from '../utils';

export const functionPlugin: SpecPlugin<Function & Record<any, any>, string> = {
  name: 'function',
  support: subject => {
    if (typeof subject !== 'function') return false

    if (hasPropertyInPrototype(subject)) return false

    return true
  },
  /**
   * types of subjects:
   * * the actual spec subject
   * * a supplied function (from arg) that the subject should invoke
   * * a supplied function (from arg) that the caller should invoke
   * * a function created by the subject that is
   * *   returned or thrown, or
   * *   added to the argument (out param, modifying the input directly), and
   * *   the subject should invoke, or
   * *   the caller should invoke.
   * * for object/instance, the properties can be in or out location.
   * func foo({ cb }) {
   *   cb() // active call
   *   return { body }
   * }
   * const r = foo(...)
   * r.body() // passive call
   * func prom() {
   *   return Promise.resolve()
   * }
   * const p = prom()
   * p.then(() => { // active call
   *
   * })
   */
  createSpy: ({ getProperty, invoke, setMeta }, subject) => {
    setMeta(metarize(subject))
    return new Proxy(subject, {
      apply(_, thisArg, args: any[] = []) {
        // console.log('being invoked')
        return invoke({ thisArg, args }, ({ thisArg, args }) => {
          // console.log('invoke callback', args)
          return subject.apply(thisArg, args)
        })
      },
      get(target: any, property: string) {
        if (!hasProperty(subject, property)) return undefined
        if (property === 'apply') return target[property]
        return getProperty({ key: property }, () => subject[property])
      },
      set(_, property: string, value: any) {
        return subject[property] = value
      }
    })
  },
  createStub: ({ getProperty, invoke }, _, meta) => {
    return new Proxy(demetarize(meta), {
      apply: function (_, thisArg, args: any[] = []) {
        return invoke({ thisArg, args })
      },
      get(target: any, property: string) {
        if (property === 'apply') return target[property]
        return getProperty({ key: property })
      }
    })
  }
}
