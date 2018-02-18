import { Store } from "express-session";
import { DocumentStore } from "ravendb";

export interface IOptions {
  documentType: string;
}

export class RavenDbSessionStore extends Store {
  private static defaultOptions: IOptions = {
    documentType: "Session",
  };

  private options: IOptions;

  constructor(private documentStore: DocumentStore, options?: Partial<IOptions>) {
    super();

    this.options = {
      ...RavenDbSessionStore.defaultOptions,
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
        callback(undefined, session ? session : undefined as any);
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

  private async setSession(sessionId: string, session: Express.Session) {
    const documentSession = this.documentStore.openSession();

    const sessionDocument = {
      ...session,
      id: sessionId,
    };

    await documentSession.store(sessionDocument, sessionId, {
      documentType: this.options.documentType,
    });

    await documentSession.saveChanges();
  }

  private async getSession(sessionId: string): Promise<Express.SessionData | undefined> {
    const documentSession = this.documentStore.openSession();

    const sessionDocument = await documentSession.load(sessionId, {
      documentType: this.options.documentType,
    });

    return sessionDocument ? {
      ...sessionDocument,
      "@meta": undefined,
      "cookie": sessionDocument.cookie,
    } : undefined;
  }

  private async destroySession(sessionId: string) {
    const documentSession = this.documentStore.openSession();

    await documentSession.delete(sessionId, {
      documentType: this.options.documentType,
    });

    await documentSession.saveChanges();
  }
}
