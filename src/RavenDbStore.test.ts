import { DocumentStore } from "ravendb";
import * as Uuid from "uuid/v1";

import { RavenDbStore } from "./RavenDbStore";

describe("RavenDbStore", () => {
  let documentStore: DocumentStore;

  beforeAll(() => {
    documentStore = new DocumentStore("http://127.0.0.1:8080", "Test");

    documentStore.initialize();
  });

  const generateSessionId = () => Uuid();
  const getSessionCookie = (): Express.SessionCookie => ({
    expires: false,
    httpOnly: false,
    maxAge: 0,
    originalMaxAge: 0,
    path: "",
    serialize: () => "",
  });
  const getSession = (sessionId: string, data: object = {}): Express.Session => ({
    cookie: getSessionCookie(),
    destroy: () => undefined,
    id: sessionId,
    regenerate: () => undefined,
    reload: () => undefined,
    save: () => undefined,
    touch: () => undefined,
    ...data,
  });

  const loadSessionDocument = async (id: string, collection?: string) => {
    const documentSession = documentStore.openSession();

    const sessionDocument = await documentSession.load(id, {
      documentType: collection || "Session",
    });

    return sessionDocument;
  };

  it("should be constructable", () => {
    const instance = new RavenDbStore(documentStore);

    expect(instance).toBeDefined();
  });

  describe("set", () => {
    it("should store session document", (done) => {
      const instance = new RavenDbStore(documentStore);

      const sessionId = generateSessionId();

      const session = getSession(sessionId);

      instance.set(sessionId, session, () => {
        (async () => {
          const sessionDocument = await loadSessionDocument(sessionId);

          expect(sessionDocument).toBeDefined();
          expect(sessionDocument.id).toBe(sessionId);

          done();
        })();
      });
    });

    it("should store session document with sid parameter", (done) => {
      const instance = new RavenDbStore(documentStore);

      const sessionId = generateSessionId();
      const otherSessionId = generateSessionId();

      const session = getSession(otherSessionId);

      instance.set(sessionId, session, () => {
        (async () => {
          const sessionDocument = await loadSessionDocument(sessionId);
          const otherSessionDocument = await loadSessionDocument(otherSessionId);

          expect(sessionDocument).toBeDefined();
          expect(sessionDocument.id).toBe(sessionId);
          expect(otherSessionDocument).toBeNull();

          done();
        })();
      });
    });

    it("should store session data", (done) => {
      const instance = new RavenDbStore(documentStore);

      const sessionId = generateSessionId();

      const session = getSession(sessionId, { field: "value" });

      instance.set(sessionId, session, () => {
        (async () => {
          const sessionDocument = await loadSessionDocument(sessionId);

          const data = JSON.parse(sessionDocument.data);

          expect(data.field).toBe("value");

          done();
        })();
      });
    });
  });

  describe("get", () => {
    it("should return stored session", (done) => {
      const instance = new RavenDbStore(documentStore);

      const sessionId = generateSessionId();

      const session = getSession(sessionId);

      instance.set(sessionId, session, () => {
        instance.get(sessionId, (_err, sessionData) => {
          expect(sessionData).toBeDefined();

          done();
        });
      });
    });

    it("should return undefined when session doesn't exist", (done) => {
      const instance = new RavenDbStore(documentStore);

      const sessionId = generateSessionId();

      instance.get(sessionId, (_err, session) => {
        expect(session).toBeUndefined();

        done();
      });
    });
  });

  describe("destroy", () => {
    it("should delete session", (done) => {
      const instance = new RavenDbStore(documentStore);

      const sessionId = generateSessionId();

      const session = getSession(sessionId);

      instance.set(sessionId, session, () => {
        instance.destroy(sessionId, () => {
          (async () => {
            const sessionDocument = await loadSessionDocument(sessionId);

            expect(sessionDocument).toBeNull();

            done();
          })();
        });
      });
    });

    it("should not fail when session doesn't exist", (done) => {
      const instance = new RavenDbStore(documentStore);

      const sessionId = generateSessionId();

      instance.destroy(sessionId, () => {
        done();
      });
    });
  });

  describe("all", () => {
    it("should return all sessions", (done) => {
      const documentType = `Session_${Uuid()}`;

      const instance = new RavenDbStore(documentStore, {
        documentType,
      });

      const sessionAId = generateSessionId();

      instance.set(sessionAId, getSession(sessionAId), () => {
        const sessionBId = generateSessionId();

        instance.set(sessionBId, getSession(sessionBId), () => {
          instance.all((err, sessions) => {
            expect(Object.keys(sessions).length).toBe(2);

            done();
          });
        });
      });
    });
  });

  describe("custom document type", () => {
    it("should store document in custom collection", (done) => {
      const instance = new RavenDbStore(documentStore, {
        documentType: "CustomSession",
      });

      const sessionId = generateSessionId();
      const session = getSession(sessionId);

      instance.set(sessionId, session, () => {
        (async () => {
          const sessionDocument = loadSessionDocument(sessionId, "CustomSession");

          expect(sessionDocument).toBeDefined();

          done();
        })();
      });
    });
  });
});
