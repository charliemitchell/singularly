module.exports.FailedContextError = class FailedContextError extends Error {
  constructor(message) {
    super(message);
    this.name = "FailedContextError";
  }
}

module.exports.RollbackError = class RollbackError extends Error {
  constructor(message) {
    super(message);
    this.name = "RollbackError";
  }
}