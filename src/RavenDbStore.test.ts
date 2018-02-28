import { DeleteByQueryCommand, DocumentStore, QueryOperationOptions, RequestExecutor } from "ravendb";
import * as Uuid from "uuid/v1";

import { testConfig } from "../test.config";
import { RavenDbStore } from "./RavenDbStore";

describe("RavenDbStore", () => {
  let documentStore: DocumentStore;

  beforeAll(() => {
    const { ravenDbHost, ravenDbPort } = testConfig;

    documentStore = new DocumentStore(`http://${ravenDbHost}:${ravenDbPort}`, "Test");

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

  const loadSessionDocument = async (id: string, documentType?: string) => {
    const documentSession = documentStore.openSession();

    const sessionDocument = await documentSession.load(id, {
      documentType: documentType || RavenDbStore.defaultOptions.documentType,
    });

    return sessionDocument;
  };

  const deleteAllSessionDocuments = async (store: RavenDbStore) => {
    const documentSession = documentStore.openSession();

    const requestExecutor: RequestExecutor = (documentSession.advanced as any).requestExecutor;

    const query = documentSession.query({
      collection: documentStore.conventions.getCollectionName(store.options.documentType),
    }).getIndexQuery();

    await requestExecutor.execute(new DeleteByQueryCommand(query));
  };

  it("should be constructable", () => {
    const instance = new RavenDbStore(documentStore);

    expect(instance).toBeDefined();
  });

  describe("methods", () => {
    let instance: RavenDbStore;

    beforeEach(() => {
      instance = new RavenDbStore(documentStore);
    });

    afterEach(async () => {
      await deleteAllSessionDocuments(instance);
    });

    describe("set method", () => {
      it("should store session document", async () => {
        const sessionId = generateSessionId();

        const session = getSession(sessionId);

        await instance.set(sessionId, session);

        const sessionDocument = await loadSessionDocument(sessionId);

        expect(sessionDocument).toBeDefined();
        expect(sessionDocument.id).toBe(sessionId);
      });

      it("should store session document with sid parameter", async () => {
        const sessionId = generateSessionId();
        const otherSessionId = generateSessionId();

        const session = getSession(otherSessionId);

        await instance.set(sessionId, session);

        const sessionDocument = await loadSessionDocument(sessionId);
        const otherSessionDocument = await loadSessionDocument(otherSessionId);

        expect(sessionDocument).not.toBeNull();
        expect(sessionDocument.id).toBe(sessionId);
        expect(otherSessionDocument).toBeNull();
      });

      it("should store session data", async () => {
        const sessionId = generateSessionId();

        const session = getSession(sessionId, { field: "value" });

        await instance.set(sessionId, session);

        const sessionDocument = await loadSessionDocument(sessionId);

        const data = JSON.parse(sessionDocument.data);

        expect(data.field).toBe("value");
      });

      it("should set expiration", async () => {
        const sessionId = generateSessionId();
        const session = getSession(sessionId);

        session.cookie.maxAge = 60 * 1000;

        await instance.set(sessionId, session);

        const sessionDocument = await loadSessionDocument(sessionId);

        expect(sessionDocument["@metadata"]["@expires"]).toBeDefined();
      });
    });

    describe("get method", () => {
      it("should return stored session", async () => {
        const sessionId = generateSessionId();

        const session = getSession(sessionId);

        await instance.set(sessionId, session);

        const sessionData = await instance.get(sessionId);

        expect(sessionData).toBeDefined();
      });

      it("should return undefined when session doesn't exist", async () => {
        const sessionId = generateSessionId();

        const sessionData = await instance.get(sessionId);

        expect(sessionData).toBeUndefined();
      });
    });

    describe("destroy method", () => {
      it("should delete session", async () => {
        const sessionId = generateSessionId();

        const session = getSession(sessionId);

        await instance.set(sessionId, session);

        await instance.destroy(sessionId);

        const sessionDocument = await loadSessionDocument(sessionId);

        expect(sessionDocument).toBeNull();
      });

      it("should not fail when session doesn't exist", async () => {
        const sessionId = generateSessionId();

        await instance.destroy(sessionId);
      });
    });

    describe("all method", () => {
      it("should return all sessions", async () => {
        const sessionAId = generateSessionId();

        await instance.set(sessionAId, getSession(sessionAId));

        const sessionBId = generateSessionId();

        await instance.set(sessionBId, getSession(sessionBId));

        const sessions = await instance.all();

        expect(Object.keys(sessions).length).toBe(2);
      });
    });

    describe("clear method", () => {
      it("should delete all sessions", async () => {
        const sessionId = generateSessionId();

        await instance.set(sessionId, getSession(sessionId));

        await instance.clear();

        instance.length((_, length) => {
          expect(length).toBe(0);
        });
      });
    });

    describe("length method", () => {
      it("should return session count", async () => {
        const sessionAId = generateSessionId();

        await instance.set(sessionAId, getSession(sessionAId));

        const sessionBId = generateSessionId();

        await instance.set(sessionBId, getSession(sessionBId));

        const length = await instance.length();

        expect(length).toBe(2);
      });
    });

    describe("touch method", () => {
      it("should update expiration", async () => {
        const sessionId = generateSessionId();
        const session = getSession(sessionId);

        session.cookie.maxAge = 20 * 60 * 1000;

        await instance.set(sessionId, session);

        const sessionDocument = await loadSessionDocument(sessionId);

        await instance.touch(sessionId, session);

        const updatedSessionDocument = await loadSessionDocument(sessionId);

        expect(updatedSessionDocument["@metadata"]["@expires"]).not.toBe(sessionDocument["@metadata"]["@expires"]);
      });
    });
  });

  describe("options", () => {
    describe("document type option", () => {
      it("should store document in custom collection", async () => {
        const instance = new RavenDbStore(documentStore, {
          documentType: "CustomSession",
        });

        const sessionId = generateSessionId();
        const session = getSession(sessionId);

        await instance.set(sessionId, session);

        const sessionDocument = await loadSessionDocument(sessionId, "CustomSession");

        expect(sessionDocument).toBeDefined();
      });
    });
  });
});
