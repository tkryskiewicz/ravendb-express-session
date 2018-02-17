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
}
