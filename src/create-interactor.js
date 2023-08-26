module.exports = function createInteractor (method) {
  return class Interactor {
    call () {
      method.apply(this)
    }
  }
}

