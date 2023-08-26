const Context = require("./context");
const { called, rollback } = require("./symbols")

module.exports = class Organizer {
  constructor(...methods) {
    this.methods = methods;
  }

  async call(initialContext, options = {constructWith: []}) {
    if (initialContext instanceof Context) {
      this.context = initialContext;
    } else {
      this.context = new Context(initialContext);
    }

    const { methods, context } = this;
    try {
      try {
        // Call hooks of the Organizer Class
        if (this.skip && (await this.skip.apply(this))) return context;
        if (this.before) await this.before.apply(this);
        if (this.after) await this.after.apply(this);

        for (var i = 0; i < methods.length; i += 1) {
          if (methods[i] instanceof Organizer) {
            await methods[i].call(
              context,
              options.passOptionsToEmbeddedOrganizers ? options : undefined
            );
            continue;
          }

          const task = new methods[i](...options.constructWith);
          task.context = context;
          // Call hooks of the Interactor Class
          if (task.skip && (await task.skip())) continue;
          if (task.before) await task.before();
          await task.call();
          if (task.after) await task.after();
          context[called](task);
        }
      } catch (err) {
        await context[rollback]()
        if (err.name === "RollbackError") {
          context.error = new AggregateError([context.error, err], "RollbackError")
          return context
        }
        if (err.name != "FailedContextError") context.fail(err);
        return context;
      }
    } catch (err) {
      if (err.name === "RollbackError") {
        context.error = new AggregateError([context.error, err], "RollbackError")
        return context
      }

      return context;
    }
    // Call the after method of the Organizer Class
    if (this.after) await this.after();
    // No Failures or exceptions
    context.success = true;

    return context;
  }
};
