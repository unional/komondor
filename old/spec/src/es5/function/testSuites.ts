export const simpleCallback = {
  increment(remote: Function, value: number) {
    return new Promise<number>((a, r) => {
      remote(value, (err: Error | undefined, response: number) => {
        if (err) r(err)
        a(response)
      })
    })
  },
  success(value: number, callback: (err: any, result: number) => void) {
    callback(null, value + 1)
  },
  fail(value: number, callback: (err: any, result?: number) => void) {
    callback(new Error('fail'))
  }
}

export const fetch = {
  add(fetch: Function, x: number, y: number) {
    return new Promise((a, r) => {
      fetch('remoteAdd', { x, y }, (err: Error | undefined, response: number) => {
        if (err) r(err)
        a(response)
      })
    })
  },
  success(_url: string, options: { x: number, y: number }, callback: Function) {
    callback(null, options.x + options.y)
  },
  fail(_url: string, _options: { x: number, y: number }, callback: Function) {
    callback({ message: 'fail' }, null)
  }
}

export const literalCallback = {
  increment(remote: Function, x: number) {
    return new Promise((a, r) => {
      remote({
        data: x,
        error(_xhr: any, _textStatus: string, errorThrown: Error) {
          r(errorThrown)
        },
        success(data: number, _textStatus: string, _xhr: any) {
          a(data)
        }
      })
    })
  },
  success(options: { data: number, success: Function }) {
    options.success(options.data + 1)
  },
  fail(options: { data: number, success: Function, error: Function }) {
    options.error(null, 'failStatus', { message: 'fail' })
  }
}

export const synchronous = {
  increment(remote: Function, x: number) {
    return remote('increment', x)
  },
  success(_url: string, x: number) {
    return x + 1
  },
  fail() {
    throw new Error('fail')
  }
}

export const delayed = {
  increment(remote: Function, x: number) {
    return new Promise(a => {
      remote(x, (_: any, response: number) => {
        a(response)
      })
    })
  },
  success(a: number, callback: Function) {
    setTimeout(() => {
      callback(null, a + 1)
    }, 10)
  }
}

export const recursive = {
  decrementToZero(remote: Function, x: number) {
    return new Promise(a => {
      remote(x, (_: any, response: number) => {
        a(response > 0 ?
          recursive.decrementToZero(remote, x - 1) :
          response)
      })
    })
  },
  success(a: number, callback: Function) {
    callback(null, a - 1)
  }
}

export const postReturn = {
  fireEvent(name: string, times: number, callback: Function) {
    setImmediate(() => {
      for (let i = 0; i < times; i++)
        callback(name)
    })
    return
  }
}
