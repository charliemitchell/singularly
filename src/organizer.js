const { createContext } = require("./context");
const { catchOrganizerError } = require("./errors");

module.exports = class Organizer {
  constructor(...methods) {
    this.methods = methods;
  }

  async call(initialContext = {}) {
    const context = createContext(initialContext);

    try {
      if (this.skip && (await this.skip(context))) return context;
      if (this.before) await this.before(context);

      for (var i = 0; i < this.methods.length; i += 1) {
        if (context.failure) {
          break;
        }
        if (this.methods[i] instanceof Organizer) {
          await this.methods[i].call(context);
          continue;
        }

        const task = new this.methods[i](context);
        await task.call();
      }

      if (this.after) await this.after(context);
    } catch (err) {
      catchOrganizerError(err, context);
    } finally {
      context.success = !context.failure;
      return context;
    }
  }
};
