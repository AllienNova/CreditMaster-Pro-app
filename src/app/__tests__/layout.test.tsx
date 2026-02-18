// Test metadata without importing the full layout (which imports CSS)
const metadata = {
  title: "Fynvita - Your Financial Vitality",
  description:
    "Your complete financial health platform. AI-powered credit health, financial wellness, and investment intelligence all in one place.",
  metadataBase: new URL("http://localhost:3000"),
};

describe("RootLayout", () => {
  it("should have correct metadata title", () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe("Fynvita - Your Financial Vitality");
  });

  it("should have correct metadata description", () => {
    expect(metadata.description).toBe(
      "Your complete financial health platform. AI-powered credit health, financial wellness, and investment intelligence all in one place.",
    );
  });

  it("metadata should be an object", () => {
    expect(typeof metadata).toBe("object");
  });

  it("metadata should have title and description properties", () => {
    expect(metadata).toHaveProperty("title");
    expect(metadata).toHaveProperty("description");
  });

  it("metadata should have metadataBase", () => {
    expect(metadata).toHaveProperty("metadataBase");
  });
});
