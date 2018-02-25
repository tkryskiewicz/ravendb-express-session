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

Changes the collection in which sessions are stored.

## Available methods

Besides the required `set`, `get` and `destroy` methods, the following are also available:
- `all`, returns all sessions as a sessionId -> session key-value object
- `clear`, deletes all sessions
- `length`, returns the count of all sessions. 

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

## License

[MIT](https://opensource.org/licenses/MIT)
