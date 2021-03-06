import { SpyContext, SpyInstance } from 'komondor-plugin'

export function spyClass(context: SpyContext, subject) {
  const SpiedSubject = new Proxy(subject, {
    construct(target, args) {
      const obj = Reflect.construct(target, args, subject);
      const spyInstanceRecorder = context.newInstance(args, { className: subject.name })
      return spyInstance(spyInstanceRecorder, obj)
    },
    apply(target, that, args) {
      target.apply(that, args)
    }
  })

  return SpiedSubject
}

function spyInstance(recorder: SpyInstance, obj) {
  const spyMethods = {}
  const proxy = new Proxy(obj, {
    get(target, key) {
      if (!spyMethods[key] && typeof target[key] === 'function') {
        spyMethods[key] = function (...args) {
          const call = recorder.newCall({ methodName: key })
          const spiedArgs = call.invoke(args)
          let result
          try {
            result = target[key](...spiedArgs)
          }
          catch (err) {
            const thrown = call.throw(err)
            throw thrown
          }

          return call.return(result)
        }.bind(target)
      }

      return spyMethods[key] || target[key]
    },
    set(target, key, value) {
      // todo create property set action for method
      return target[key] = value
    }
  })
  return proxy
}
