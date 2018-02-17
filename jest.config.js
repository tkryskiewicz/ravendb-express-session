module.exports = {
  mapCoverage: true,
  moduleFileExtensions: [
    "js",
    "ts",
  ],
  testMatch: [
    "**/*.test.ts",
  ],
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
}
