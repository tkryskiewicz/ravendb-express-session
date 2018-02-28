import { DeleteByQueryCommand, DocumentStore, QueryOperationOptions, RequestExecutor } from "ravendb";
import * as Uuid from "uuid/v1";

import { testConfig } from "../test.config";
import { deleteAllSessionDocuments, generateSessionId, getSession, getSessionCookie, loadSessionDocument } from "./testHelpers";

import { RavenDbStore } from "./RavenDbStore";

describe("RavenDbStore", () => {
  let documentStore: DocumentStore;

  beforeAll(() => {
    const { ravenDbHost, ravenDbPort } = testConfig;

    documentStore = new DocumentStore(`http://${ravenDbHost}:${ravenDbPort}`, "Test");

    documentStore.initialize();
  });

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

        const sessionDocument = await loadSessionDocument(instance, sessionId);

        expect(sessionDocument).toBeDefined();
        expect(sessionDocument.id).toBe(sessionId);
      });

      it("should store session document with sid parameter", async () => {
        const sessionId = generateSessionId();
        const otherSessionId = generateSessionId();

        const session = getSession(otherSessionId);

        await instance.set(sessionId, session);

        const sessionDocument = await loadSessionDocument(instance, sessionId);
        const otherSessionDocument = await loadSessionDocument(instance, otherSessionId);

        expect(sessionDocument).not.toBeNull();
        expect(sessionDocument.id).toBe(sessionId);
        expect(otherSessionDocument).toBeNull();
      });

      it("should store session data", async () => {
        const sessionId = generateSessionId();

        const session = getSession(sessionId, { field: "value" });

        await instance.set(sessionId, session);

        const sessionDocument = await loadSessionDocument(instance, sessionId);

        const data = JSON.parse(sessionDocument.data);

        expect(data.field).toBe("value");
      });

      it("should set expiration", async () => {
        const sessionId = generateSessionId();
        const session = getSession(sessionId);

        session.cookie.maxAge = 60 * 1000;

        await instance.set(sessionId, session);

        const sessionDocument = await loadSessionDocument(instance, sessionId);

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

        const sessionDocument = await loadSessionDocument(instance, sessionId);

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

        const sessionDocument = await loadSessionDocument(instance, sessionId);

        await instance.touch(sessionId, session);

        const updatedSessionDocument = await loadSessionDocument(instance, sessionId);

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

        const sessionDocument = await loadSessionDocument(instance, sessionId, "CustomSession");

        expect(sessionDocument).toBeDefined();
      });
    });
  });
});
