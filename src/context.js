const { FailedContextError, RollbackError } = require("./errors")
const { called, rollback } = require("./symbols")

module.exports = class Context {
  constructor (context) {
    Object.assign(this, context)
  }

  [called] (interactor) {
    this.#called.push(interactor) 
  }

  fail (error) {
    this.failure = true;
    this.success = false;
    this.error = error;
    throw new FailedContextError(error)
  }

  async [rollback] () {
    while (this.#called.length) {
      let instance = this.#called.pop()
      if (instance.rollback) {
        try {
          await instance.rollback()
        } catch (err) {
          throw new RollbackError(err)
        }
      }
    }
  }

  #called = [];
  failure = false;
  success = false;
}
