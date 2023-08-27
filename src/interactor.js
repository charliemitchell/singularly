const { createContext } = require("./context");
const { called } = require("./symbols");
const { catchInteractorError } = require("./errors");

class Interactor {
  constructor(context = {}) {
    this.context = createContext(context);
    this.#call = this.call;
    this.call = this.#run;
  }

  context;
  #call;

  async #invokable() {
    return this.skip ? !(await this.skip()) : true;
  }

  async #before() {
    this.context.success = false;
    this.before && (await this.before());
  }

  async #after() {
    this.context.success = !this.context.failure;
    this.after && (await this.after());
    this.context[called](this);
  }

  async #run() {
    try {
      if (await this.#invokable()) {
        await this.#before();
        await this.#call();
        await this.#after();
      }
    } catch (err) {
      catchInteractorError(err, this.context);
    } finally {
      return this.context;
    }
  }
}

module.exports = Interactor;
