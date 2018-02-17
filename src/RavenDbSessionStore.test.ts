import { RavenDbSessionStore } from "./RavenDbSessionStore";

describe("RavenDbSessionStore", () => {
  it("should be constructable", () => {
    const instance = new RavenDbSessionStore();

    expect(instance).toBeDefined();
  });
});
