const { FailedContextError, RollbackError } = require("./errors")
const { called, rollback, fail } = require("./symbols")

class Context {
  constructor (context) {
    Object.assign(this, context)
  }

  [called] (interactor) {
    this.#called.push(interactor) 
  }

  fail (error) {
    this[fail](error)
    throw new FailedContextError(error)
  }

  [fail] (error) {
    this.failure = true;
    this.success = false;
    this.error = error;
  }

  async [rollback] () {
    while (this.#called.length) {
      let instance = this.#called.pop()
      if (instance.rollback) {
        try {
          await instance.rollback()
        } catch (err) {
          this[fail](new AggregateError([this.error, err], "RollbackError"))
        }
      }
    }
  }

  #called = [];
  failure = false;
  success = false;
}

module.exports.Context = Context;

module.exports.createContext = function (context = {}) {
  if (context instanceof Context) {
    return  context;
  } else {
    return new Context(context);
  }
}