import { SpecPlugin } from '../spec';
import { demetarize, metarize } from '../utils';
import { isClass } from './isClass';

export const classPlugin: SpecPlugin<new (...args: any[]) => void> = {
  name: 'class',
  support: isClass,
  createSpy(context, subject) {
    context.setMeta(metarize(subject))
    // console.log('createSpy', subject, subject.prototype, subject.prototype.constructor)
    const Spy: any = function (...args: any[]) {
      return context.instantiate2({ args }, ({ args }) => {
        const _this = new subject(...args)
        Object.setPrototypeOf(_this, new.target.prototype)
        return _this
      })
    }

    Object.setPrototypeOf(Spy.prototype, subject.prototype)
    Object.setPrototypeOf(Spy, subject)

    return Spy
  },
  createStub(context, subject, meta) {
    const base = subject || demetarize(meta)
    const Stub: any = function (...args: any[]) {
      return context.instantiate2({ args }, ({ args }) => {
        const _this = new base(...args)
        Object.setPrototypeOf(_this, new.target.prototype)
        return _this
      })
    }

    Object.setPrototypeOf(Stub.prototype, base.prototype)
    Object.setPrototypeOf(Stub, base)

    return Stub
  },
}
