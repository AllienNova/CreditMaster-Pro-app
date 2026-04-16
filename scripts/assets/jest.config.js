module.exports = {
  roots: ["<rootDir>/__tests__"],
  testEnvironment: "node",
  testRegex: "(/__tests__/.*\\.(test|spec))\\.[jt]sx?$",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "CommonJS",
          moduleResolution: "node",
          esModuleInterop: true,
          strict: true,
          target: "ES2020",
          skipLibCheck: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testTimeout: 10000,
};
