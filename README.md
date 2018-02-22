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
- `length` are also available. 

`touch` method is comming soon.

## License

[MIT](https://opensource.org/licenses/MIT)
