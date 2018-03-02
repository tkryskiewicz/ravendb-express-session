# ravendb-express-session

RavenDB session store for Express.js.

## Installation

```sh
$ npm install ravendb-express-session
```

## Usage

```js
import * as Express from "express";
import * as Session from "express-session";
import { DocumentStore } from "ravendb";
import { RavenDbStore } from "ravendb-express-session";

const app = Express();

const store = new DocumentStore("http://127.0.0.1:8080", "Database");

store.initialize();

app.use(Express.json(), Session({
  store: new RavenDbStore(store),
  // other options
}));

app.listen(3000, () => console.log("Example app listening on port 3000!"));
```

## Options

```js
const sessionStore = new RavenDbStore(store, {
  // options
});
```

### documentType

Default: `"Session"`

Changes the document id and collection in which sessions are stored. 
For default value this results in `Sessions/__sessionId__` and `Sessions` respectively.

## Available methods

Besides the required `set`, `get` and `destroy` methods, the following are also available:
- `all`, returns all sessions as a sessionId -> session key-value object
- `clear`, deletes all sessions
- `length`, returns the count of all sessions
- `touch`, resets the session expiration date.

## Using with promises

All implemented methods support promises, so it's easier to use them in more modern codebases.

When using promises:

```js
store.destroy("sessionId")
  .then(() => {
    // success
  })
  .catch((error) => {
    // handle error
  });
```

or using async/await:

```js
try {
  await store.destroy("sessionId");

  // success
} catch (error) {
  // handle error
}
```

# Running tests

This project comes with a suite of tests. To run them, ensure that you have a running instance of RavenDB. Verify that settings in `test.config.ts` contain it's url and port. Then run the tests with the following command:

```sh
$ npm test
```

The suite creates a temporary database, runs all tests and then tears it down (hard delete).

## License

[MIT](https://opensource.org/licenses/MIT)
