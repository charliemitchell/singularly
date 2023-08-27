const Interactor = require("./interactor");

module.exports = function createInteractor (method) {
  return class BasicInteractor extends Interactor {
    call () {
      method.apply(this)
    }
  }
}

