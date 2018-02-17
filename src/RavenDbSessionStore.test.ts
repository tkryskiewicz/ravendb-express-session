import { DocumentStore } from "ravendb";

import { RavenDbSessionStore } from "./RavenDbSessionStore";

describe("RavenDbSessionStore", () => {
  let documentStore: DocumentStore;

  beforeAll(() => {
    documentStore = new DocumentStore("http://127.0.0.1:8080", "Test");

    documentStore.initialize();
  });

  const generateSessionId = () => Math.random().toString().substr(2, 9);

  const loadSessionDocument = async (id: string) => {
    const documentSession = documentStore.openSession();

    const sessionDocument = await documentSession.load(id, { documentType: "Session" });

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

      const session: Express.Session = {
        id: sessionId,
      } as any;

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

      const session: Express.Session = {
        id: otherSessionId,
      } as any;

      instance.set(sessionId, session, () => {
        (async () => {
          const sessionDocument = await loadSessionDocument(sessionId);
          const otherSessionDocument = await loadSessionDocument(otherSessionId);

          expect(sessionDocument).toBeDefined();
          expect(sessionDocument.id).toBe(sessionId);
          expect(otherSessionDocument).toBeNull();

          done();
        })();
      })
    });

    it("should store session data", (done) => {
      const instance = new RavenDbSessionStore(documentStore);

      const sessionId = generateSessionId();

      const session: Express.Session = {
        id: sessionId,
        data: "data",
      } as any;

      instance.set(sessionId, session, () => {
        (async () => {
          const sessionDocument = await loadSessionDocument(sessionId);

          expect(sessionDocument.data).toBe("data");

          done();
        })();
      });
    });
  });
});
