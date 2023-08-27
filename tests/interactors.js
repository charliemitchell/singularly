const { Organizer, Interactor, createInteractor } = require("../index");

module.exports.SetsAValue = class SetsAValue extends Interactor {
  async call () {
    this.context.value = true;
  }
}

module.exports.HasException = class HasException extends Interactor {
  async call () {
    throw new Error("ohno")
  }
}

class AllHooks extends Interactor {
  before() {
    this.context.before = true
  }
  after() {
    this.context.after = true
  }

  async call() {
    this.context.call = true
  }
}

module.exports.UploadFile = class UploadFile extends Interactor {
  async call() {
    this.context.file = "tmp/some-file.ext";
    return Promise.resolve();
  }
}

module.exports.ProcessFile = createInteractor(async function () {
  this.context.processedFile = "tmp/processed-file.ext";
});

class ValidateUser extends Interactor  {
  before () {
    if (!this.context.userParams) {
      this.context.fail(Error("context.userParams are required"))
    }
  }

  call () {
    this.context.validUser = !!this.context.userParams.name
  }
}

class CreateUser extends Interactor  {
  call () {
    this.context.user = { name: this.context.userParams.name }
  }
}

class SignInUser extends Interactor  {
  before () {
    if (!this.context.user) {
      context.fail(new Error("context.user is required"))
    }
  }

  async call () {
    return new Promise(resolve => {
      setTimeout(() => {
        this.context.currentUser = this.context.user
        resolve()
      }, 5)
    })
  }
}

class CreateWelcomeEmail extends Interactor  {
  before () {
    this.context.emails = []
  }

  call () {
    this.context.emails.push({to: "foo"})
  }
}

class SendCommunications extends Interactor {
  skip () {
    return !this.context.emails || this.context.emails.length === 0
  }

  call () {
    this.context.communicationsDelivered = this.context.emails
  }
}


class CreateAccountOrganizer extends Organizer {
  skip (context) {
    return !context.validUser
  }
}

module.exports.CreateAccountOrganizer = new CreateAccountOrganizer(
  CreateUser,
  SignInUser,
  CreateWelcomeEmail,
  SendCommunications
)

module.exports.CreateValidAccount = new Organizer(
  ValidateUser,
  module.exports.CreateAccountOrganizer
)

module.exports.SendCommunications = SendCommunications
module.exports.ValidateUser = ValidateUser
module.exports.AllHooks = AllHooks;