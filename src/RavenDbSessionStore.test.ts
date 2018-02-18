import { DocumentStore } from "ravendb";
import * as Uuid from "uuid/v1";

import { RavenDbSessionStore } from "./RavenDbSessionStore";

describe("RavenDbSessionStore", () => {
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
    const instance = new RavenDbSessionStore(documentStore);

    expect(instance).toBeDefined();
  });

  describe("set", () => {
    it("should store session document", (done) => {
      const instance = new RavenDbSessionStore(documentStore);

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
      const instance = new RavenDbSessionStore(documentStore);

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
      const instance = new RavenDbSessionStore(documentStore);

      const sessionId = generateSessionId();

      const session = getSession(sessionId, { data: "data" });

      instance.set(sessionId, session, () => {
        (async () => {
          const sessionDocument = await loadSessionDocument(sessionId);

          expect(sessionDocument.data).toBe("data");

          done();
        })();
      });
    });
  });

  describe("get", () => {
    it("should return stored session", (done) => {
      const instance = new RavenDbSessionStore(documentStore);

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
      const instance = new RavenDbSessionStore(documentStore);

      const sessionId = generateSessionId();

      instance.get(sessionId, (_err, session) => {
        expect(session).toBeUndefined();

        done();
      });
    });
  });

  describe("destroy", () => {
    it("should delete session", (done) => {
      const instance = new RavenDbSessionStore(documentStore);

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
      const instance = new RavenDbSessionStore(documentStore);

      const sessionId = generateSessionId();

      instance.destroy(sessionId, () => {
        done();
      });
    });
  });

  describe("custom document type", () => {
    it("should store document in custom collection", (done) => {
      const instance = new RavenDbSessionStore(documentStore, {
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
