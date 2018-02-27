import { Store } from "express-session";
import {
  DeleteByQueryCommand,
  DocumentStore,
  IDocumentSession,
  IndexQuery,
  PatchByQueryCommand,
  QueryOperationOptions,
  RequestExecutor,
} from "ravendb";

export interface SessionDocument {
  data: string;
}

export interface SessionDataCollection {
  [sid: string]: Express.SessionData;
}

export interface RavenDbStoreOptions {
  documentType: string;
}

export class RavenDbStore extends Store {
  private static defaultOptions: RavenDbStoreOptions = {
    documentType: "Session",
  };

  private options: RavenDbStoreOptions;

  constructor(private documentStore: DocumentStore, options?: Partial<RavenDbStoreOptions>) {
    super();

    this.options = {
      ...RavenDbStore.defaultOptions,
      ...options,
    };
  }

  public set = (sid: string, session: Express.Session, callback?: (err: any) => void) => {
    return this.handlePromise(this.setSession(sid, session), callback);
  }

  public get = (sid: string, callback?: (err: any, sessionData: Express.SessionData) => void) => {
    return this.handlePromise(this.getSessionData(sid), callback);
  }

  public destroy = (sid: string, callback?: (err: any) => void) => {
    return this.handlePromise(this.destroySession(sid), callback);
  }

  public all = (callback?: (err: any, obj: SessionDataCollection) => void) => {
    return this.handlePromise(this.getAllSessions(), callback);
  }

  public clear = (callback?: (err: any) => void) => {
    return this.handlePromise(this.clearSessions(), callback);
  }

  public length = (callback?: (err: any, length: number) => void) => {
    return this.handlePromise(this.getCount(), callback);
  }

  public touch = (sid: string, session: Express.Session, callback?: (err: any) => void) => {
    return this.handlePromise(this.touchSession(sid, session), callback);
  }

  private async setSession(sessionId: string, session: Express.Session) {
    const documentSession = this.documentStore.openSession();

    const sessionDocument = this.serializeSession(session);

    await documentSession.store(sessionDocument, sessionId, {
      documentType: this.options.documentType,
    });

    await documentSession.saveChanges();
  }

  private async getSessionData(sessionId: string): Promise<Express.SessionData> {
    const documentSession = this.documentStore.openSession();

    const sessionDocument = await documentSession.load<SessionDocument>(sessionId, {
      documentType: this.options.documentType,
    });

    return sessionDocument ? this.deserializeSession(sessionDocument) : undefined as any;
  }

  private async destroySession(sessionId: string) {
    const documentSession = this.documentStore.openSession();

    await documentSession.delete(sessionId, {
      documentType: this.options.documentType,
    });

    await documentSession.saveChanges();
  }

  private async getAllSessions() {
    const documentSession = this.documentStore.openSession();

    const sessionDocuments = await documentSession
      .query<SessionDocument>({
        collection: this.documentStore.conventions.getCollectionName(this.options.documentType),
        documentType: this.options.documentType,
      })
      .waitForNonStaleResults()
      .all();

    const sessions = sessionDocuments
      .map((document): Express.SessionData => this.deserializeSession(document))
      .reduce((p: SessionDataCollection, c) => {
        p[c.id] = c;

        return p;
      }, {});

    return sessions;
  }

  private async clearSessions() {
    const documentSession = this.documentStore.openSession();

    const requestExecutor = this.getRequestExecutor(documentSession);

    const collectionName = this.documentStore.conventions.getCollectionName(this.options.documentType);

    const query = new IndexQuery(`from ${collectionName}`, undefined, undefined, undefined, {
      waitForNonStaleResults: true,
    });

    await requestExecutor.execute(new DeleteByQueryCommand(query));
  }

  private async getCount() {
    const documentSession = this.documentStore.openSession();

    const count = await documentSession
      .query<SessionDocument>({
        collection: this.documentStore.conventions.getCollectionName(this.options.documentType),
        documentType: this.options.documentType,
      })
      .waitForNonStaleResults()
      .count();

    return count;
  }

  private async touchSession(sessionId: string, session: Express.Session) {
    if (!session.cookie.maxAge) {
      return;
    }

    const documentSession = this.documentStore.openSession();

    const requestExecutor = this.getRequestExecutor(documentSession);

    const collectionName = this.documentStore.conventions.getCollectionName(this.options.documentType);

    const expirationDate = this.getExpirationDate(session.cookie.maxAge);

    expirationDate.setFullYear(2020);

    const query = new IndexQuery(
      `from ${collectionName} as s ` +
      `where id(s) = "${sessionId}" ` +
      `update {
        s["@metadata"]["@expires"] = "${expirationDate.toISOString()}";
        s.Test = "TEST";
       }`,
      undefined, undefined, undefined, {
        waitForNonStaleResults: true,
      });

    await requestExecutor.execute(new PatchByQueryCommand(query, new QueryOperationOptions(false)));
  }

  private getRequestExecutor(documentSession: IDocumentSession) {
    return (documentSession.advanced as any).requestExecutor as RequestExecutor; // FIXME: hacky!
  }

  private getExpirationDate(maxAge: number) {
    return new Date(new Date().valueOf() + maxAge);
  }

  private serializeSession(session: Express.SessionData): SessionDocument {
    const document: any = {
      data: JSON.stringify(session),
    };

    if (session.cookie.maxAge !== null) {
      document["@metadata"] = {
        "@expires": this.getExpirationDate(session.cookie.maxAge).toISOString(),
      };
    }

    return document;
  }

  private deserializeSession(document: SessionDocument): Express.SessionData {
    return JSON.parse(document.data);
  }

  private handlePromise<T>(promise: Promise<T>, callback?: (err: any, result: T) => void) {
    return promise
      .then((result) => {
        if (callback) {
          callback(undefined, result);
        }

        return result;
      })
      .catch((error) => {
        if (callback) {
          callback(error, undefined as any);
        }

        throw error;
      });
  }
}
