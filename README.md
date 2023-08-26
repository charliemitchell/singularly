# Singularly

[![Build Status](https://github.com/charliemitchell/singularly/.github/workflows/node.js.yml/badge.svg)](https://github.com/charliemitchell/singularly/.github/workflows/node.js.yml)


Singularly is an implementation of a the interactor design pattern. An interactor is a simple, single-purpose javascript class. It's functional in nature, prescriptive, clean, and easy to test. 

Interactors are meant to encapsulate your application's business logic. Each interactor
represents one thing that your application *does*.

## Getting Started

```sh
yarn add singularly
```
or
```sh
npm install singularly --save
```

### Context

An interactor is given a *context*. The context contains everything the
interactor needs to do its work.

When an interactor does its single purpose, it affects it's given context.

#### Adding to the Context

As an interactor runs it can add information to the context.

```js
this.context.user = user
```

#### Failing the Context

When something goes wrong in your interactor, you can flag the context as failed, which halts all subsequent interactors or organizers.

These are ideal ways to fail an interactor because you can always expect that `context.error.message` is set
```js
this.context.fail(someInstanceOfError)
this.context.fail(new Error("You can't triple stamp a double stamp"))
this.context.fail({ message: "You can't triple stamp a double stamp" })
```

These are less ideal ways to fail an interactor.
```js
// This isn't really useful, and has no structure
this.context.fail()
// This can be confusing because errors have structure
this.context.fail("Refusing to continue")
```

When given an argument, the `fail` method will also update `context.error` The argument should be an object, or an error object as mentioned above.

```js
const context = await FailedOrganizer.call()
context.failure // true
context.success // false
context.error // the argument to context.fail
```

When you don't call `this.context.fail` then this will automatically mark the context as a success

```js
const context = await SuccessfulOrganizer.call()
context.success // true
context.failure // false
context.error // undefined
```

#### Dealing with Failure

`this.context.fail` always throws an error of type `FailedContextError`.

Normally, however, these exceptions are not seen because the `call` method on the organizer swallows exceptions. 

In the recommended usage, the invoking code (maybe a controller) invokes the interactor using the class method `call`, then checks the `success` value of the context.

Types of errors that you might encounter:
```js
try {
  await MyOrganizer.call()
} catch (err) {
  8565// When you call context.fail, the err.name will be "FailedContextError"
  err.name === "FailedContextError"
  
  // When an exception occurs, the err.name will be that of the exception
  err.name === "Error"

  // when an error occurs in a rollback
  err.message === "RollbackError"
  err.name === "AggregateError" 
  err.errors === [ TheOriginalError, TheErrorThatOccuredDuringRollback ]
}
```

### Hooks
Hooks apply to both interactors and organizers

#### Before Hook

Sometimes an interactor or an organizer needs to prepare its context before it is even run. This can be done with the before hook.

```js
before () {
  this.context.emails_sent = 0
}
```

#### After Hook

Interactors and organizers can also perform teardown operations after the instance is run.

```js
after () {
  this.context.user = this.context.user.reload()
}
```

NB: After hooks are only run on success. If the `fail!` method is called, the after hook is not run.

#### Skip Hook
Sometimes you may want to skip calling an interactor or an organizer. The skip hook allows you to bypass the `call` invocation

```js
skip () {
  return this.context.user.isAdmin
}
```

#### Method Sequence

1: skip
2: before
3: call
4: after

### An Example Interactor

Your application could use an interactor to authenticate a user.

```js
class AuthenticateUser
  async call () {
    if (await this.authenticate()) {
      this.context.token = this.context.user.secret_token
    } else {
      this.context.fail({ message: "AuthenticateUser.failure" })
    }
  }

  async authenticate () {
    const { email, password } = this.context
    this.context.user = User.authenticate({ email, password })
    return this.context.user;
  }
}
```

To define an interactor, simply create a class a `call` instance method. The interactor can access its `context` from within `call`.

## Interactors in a Controller

Most of the time, your application might use its interactors from controllers. The following controller:

```js
class SessionsController
  constructor(req, res) {
    this.req = req
    this.res = res
  }

  create () {
    const context = AuthenticateUser.call(this.sessionContext)
    if (context.success) {
      this.session.user_token = context.token
      this.res.redirect(/* wherever */)
    }
  }

  get sessionContext () {
    return {
      email: this.req.body.email,
      password: this.req.body.password
    }
  }
}
```

The `call` class method is the proper way to invoke an interactor. The object
argument is converted to the interactor instance's context. The `call` instance
method is invoked along with any hooks that the interactor might define.
Finally, the context (along with any changes made to it) is returned.


**TIP:** Name your interactors after your business logic, not your
implementation. `CancelAccount` will serve you better than `DestroyUser` as the
account cancellation interaction takes on more responsibility in the future.

### The Future™

**SPOILER ALERT:** Your use case won't *stay* so simple.

In my experience, a simple task like
authenticating a user will eventually take on multiple responsibilities:

* Welcoming back a user who hadn't logged in for a while
* Prompting a user to update his or her password
* Locking out a user in the case of too many failed attempts
* Sending the lock-out email notification

The list goes on, and as that list grows, so does your controller. This is how
fat controllers are born.

If instead you use an interactor right away, as responsibilities are added, your
controller (and its tests) change very little or not at all. Choosing the right
kind of interactor can also prevent simply shifting those added responsibilities
to the interactor.

## Kinds of Interactors

There are two kinds of interactors built into the Interactor library: basic
interactors and organizers.

### Interactors

A basic interactor is a class that simply defines `call`.

```js
class UploadFile
  async call () {
    this.context.uploadedFile = await new FileUploader(this.context.file).upload()
  }
}
```

Basic interactors are the building blocks. They are your application's
single-purpose units of work.

### Organizers

An organizer is an important variation on the basic interactor. Its single
purpose is to run *other* interactors or organizers.

```js
import { Organizer } from "interactor-organizer-js"

export default new Organizer(CreateOrder, ChargeCard, SendThankYou)
```

The organizer passes its context to the interactors that it organizes, one at a
time and in order. Each interactor may change that context before it's passed
along to the next interactor.

##### Invoking organizers, initial context, and options
You invoke an organizer by invoking the `call` method.
The `call` method arguments are `call(initialContext)`

The *optional* `initialContext` argument is an object that will become the initial context for the organizer and made available to all subsequent organizers and interactors.


#### Rollback

If any one of the organized interactors fails its context, the organizer stops.
If the `ChargeCard` interactor fails, `SendThankYou` is never called.

In addition, any interactors that had already run are given the chance to undo
themselves, in reverse order. Simply define the `rollback` method on your
interactors:

```js
class CreateOrder {
   call () {
    context.order = Order.create(params)
   }

   rollback () {
    context.order.destroy()
   }
}
```

**NOTE:** The interactor that fails is *not* rolled back. Because every
interactor should have a single purpose, there should be no need to clean up
after any failed interactor.

## Testing Interactors

When written correctly, an interactor is easy to test because it only *does* one thing. Take the following interactor:

```js
class AuthenticateUser {
  call () {
    if (user = User.authenticate(username, password)) {
      context.user = user
      context.token = user.secret_token
    } else {
      context.fail!(message: "AuthenticateUser.failure")
    }
  }
}
```

You can test just this interactor's single purpose and how it affects the
context.

```js
import { Organizer } from "interactor-organizer-js"
const organizer = new Organizer(AuthenticateUser)

describe("AuthenticateUser" () => {
  describe("call", () => {
    describe("when given valid credentials", () => {
      /*
      * NOTE:
      * for brevity, assume that you stubbed User.authenticate to return a valid user
      */
      test("it succeeds", async () => {
        const context = await organizer.call()
        expect(context.success).toBe(true)
      })

      test("provides the user", async () => {
        const context = await organizer.call()
        expect(context.user).toBeTruthy()
      })

      test("provides the user's secret token", async () => {
        const context = await organizer.call()
        expect(context.token).toBe("token")
      })
    })

    describe("when given invalid credentials", () => {
      /*
      * NOTE:
      * for brevity, assume that you stubbed User.authenticate to return null
      */
      test("it fails", async () => {
        const context = await organizer.call()
        expect(context.failure).toBe(true)
      })

      test("provides a failure message", async () => {
        const context = await organizer.call()
        expect(context.error.message).toBe("AuthenticateUser.failure")
      })
    })
  })
})
```

This is written using Jest, but the same principle applies to any testing framework.

### Isolation

It's a good idea to stub `User.authenticate` in our test rather than creating
users in the database. That's because our purpose in
`authenticate-user.test.js` is to test just the
`AuthenticateUser` interactor. The `User.authenticate` method should be put through its
own paces in it's own test.

It's a good idea to define your own interfaces to your models. Doing so makes it
easy to draw a line between which responsibilities belong to the interactor and
which to the model. The `User.authenticate` method is a good, clear line.
Imagine the interactor otherwise:

```js
class AuthenticateUser {
  call () {
    const user = User.findBy({ email: this.context.email })
    // Yuck! 🤢
    if (user) {
      // Ewww! Gross 🤮
      if (await bcrypt.compare(this.context.password, user.encrypted_password) === this.context.password) {
        this.context.user = user
        return
      }
    }

    this.context.fail({ message: "AuthenticateUser.failure" })
  }
}
```

It would be very difficult to test this interactor in isolation and even if you
did, as soon as you change your ORM or your encryption algorithm, your interactors (business concerns) break.

*Draw clear lines.*

## Contributions

Interactor is open source and contributions from the community are encouraged!
No contribution is too small.
