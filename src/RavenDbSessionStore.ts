import { Store } from "express-session";
import { DocumentStore } from "ravendb";

export class RavenDbSessionStore extends Store {
  constructor(private documentStore: DocumentStore) {
    super();
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

  private async setSession(sessionId: string, session: Express.Session) {
    const documentSession = this.documentStore.openSession();

    const sessionDocument = {
      ...session,
      id: sessionId,
    };

    await documentSession.store(sessionDocument, sessionId, {
      documentType: "Session",
    });

    await documentSession.saveChanges();
  }

  private async getSession(sessionId: string): Promise<Express.SessionData | undefined> {
    const documentSession = this.documentStore.openSession();

    const sessionDocument = await documentSession.load(sessionId, { documentType: "Session" });

    return sessionDocument ? {
      ...sessionDocument,
      "@meta": undefined,
      "cookie": sessionDocument.cookie,
    } : undefined;
  }
}
