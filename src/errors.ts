export class MissingGivenHandler extends Error {
  // istanbul ignore next
  constructor(public clause: string) {
    super(`Handler for '${clause}' not found.`)

    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class MissingSpecID extends Error {
  // istanbul ignore next
  constructor(public mode: string) {
    super(`Spec running in '${mode}' mode must have id defined.`)

    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class DuplicateGivenHandler extends Error {
  // istanbul ignore next
  constructor(public clause: string | RegExp) {
    super(`Handler for '${clause}' is already defined.`)

    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class GivenSaveRequireSpecId extends Error {
  // istanbul ignore next
  constructor(public clause: string) {
    super(`given.save('${clause}', ...) requires spec to have id defined`)

    Object.setPrototypeOf(this, new.target.prototype)
  }
}