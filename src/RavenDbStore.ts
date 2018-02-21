import { Store } from "express-session";
import { DocumentStore } from "ravendb";

export interface ISessionDocument {
  data: string;
}

export interface IRavenDbStoreOptions {
  documentType: string;
}

export class RavenDbStore extends Store {
  private static defaultOptions: IRavenDbStoreOptions = {
    documentType: "Session",
  };

  private options: IRavenDbStoreOptions;

  constructor(private documentStore: DocumentStore, options?: Partial<IRavenDbStoreOptions>) {
    super();

    this.options = {
      ...RavenDbStore.defaultOptions,
      ...options,
    };
  }

  public set = (sid: string, session: Express.Session, callback: (err: any) => void) => {
    this.setSession(sid, session)
      .then(() => {
        callback(undefined);
      })
      .catch((error) => {
        callback(error);
      });
  }

  public get = (sid: string, callback: (err: any, session: Express.SessionData) => void) => {
    this.getSession(sid)
      .then((session) => {
        callback(undefined, session || undefined as any);
      })
      .catch((error) => {
        callback(error, undefined as any);
      });
  }

  public destroy = (sid: string, callback: (err: any) => void) => {
    this.destroySession(sid)
      .then(() => {
        callback(undefined);
      })
      .catch((error) => {
        callback(error);
      });
  }

  public all = (callback: (err: any, obj: { [sid: string]: Express.SessionData; }) => void) => {
    this.getAllSessions()
      .then((sessions) => {
        callback(undefined, sessions);
      })
      .catch((error) => {
        callback(error, undefined as any);
      });
  }

  private async setSession(sessionId: string, session: Express.Session) {
    const documentSession = this.documentStore.openSession();

    const sessionDocument = this.serializeSession(session);

    await documentSession.store(sessionDocument, sessionId, {
      documentType: this.options.documentType,
    });

    await documentSession.saveChanges();
  }

  private async getSession(sessionId: string): Promise<Express.SessionData | undefined> {
    const documentSession = this.documentStore.openSession();

    const sessionDocument = await documentSession.load<ISessionDocument>(sessionId, {
      documentType: this.options.documentType,
    });

    return sessionDocument ? this.deserializeSession(sessionDocument) : undefined;
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
      .query<ISessionDocument>({
        collection: this.options.documentType + "s",
        documentType: this.options.documentType,
      })
      .all();

    const sessions = sessionDocuments
      .map((document): Express.SessionData => this.deserializeSession(document))
      .reduce((p: { [sessionId: string]: Express.SessionData }, c) => {
        p[c.id] = c;

        return p;
      }, {});

    return sessions;
  }

  private serializeSession(session: Express.SessionData): ISessionDocument {
    return {
      data: JSON.stringify(session),
    };
  }

  private deserializeSession(document: ISessionDocument): Express.SessionData {
    return JSON.parse(document.data);
  }
}
