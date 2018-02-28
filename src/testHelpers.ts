import { DeleteByQueryCommand, RequestExecutor } from "ravendb";
import * as Uuid from "uuid/v1";

import { RavenDbStore } from "./RavenDbStore";

export const generateSessionId = () => Uuid();

export const getSessionCookie = (): Express.SessionCookie => ({
  expires: false,
  httpOnly: false,
  maxAge: null,
  originalMaxAge: 0,
  path: "",
  serialize: () => "",
});

export const getSession = (sessionId: string, data: object = {}): Express.Session => ({
  cookie: getSessionCookie(),
  destroy: () => undefined,
  id: sessionId,
  regenerate: () => undefined,
  reload: () => undefined,
  save: () => undefined,
  touch: () => undefined,
  ...data,
});

export const loadSessionDocument = async (store: RavenDbStore, id: string, documentType?: string) => {
  const documentSession = store.documentStore.openSession();

  const sessionDocument = await documentSession.load(id, {
    documentType: documentType || RavenDbStore.defaultOptions.documentType,
  });

  return sessionDocument;
};

export const deleteAllSessionDocuments = async (store: RavenDbStore) => {
  const documentSession = store.documentStore.openSession();

  const requestExecutor: RequestExecutor = (documentSession.advanced as any).requestExecutor;

  const query = documentSession.query({
    collection: store.documentStore.conventions.getCollectionName(store.options.documentType),
  }).getIndexQuery();

  await requestExecutor.execute(new DeleteByQueryCommand(query));
};
