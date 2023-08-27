const { rollback, fail } = require("./symbols")

module.exports.FailedContextError = class FailedContextError extends Error {
  constructor(message) {
    super(message);
    this.name = "FailedContextError";
  }
};

module.exports.RollbackError = class RollbackError extends Error {
  constructor(message) {
    super(message);
    this.name = "RollbackError";
  }
};

module.exports.catchInteractorError = async function (err, context) {
  await context[rollback]();

  if (err.name != "FailedContextError") {
    context[fail](err);
  }
};

module.exports.catchOrganizerError = async function (err, context) {
  if (err.name != "FailedContextError") {
    context[fail](err);
  }
};
