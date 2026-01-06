import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Security Configuration", () => {
  const nextConfigPath = path.join(
    process.cwd(),
    "templates/base/web/next.config.ts"
  );

  it("should have next.config.ts with security settings", () => {
    const content = fs.readFileSync(nextConfigPath, "utf-8");

    // Check for poweredByHeader
    expect(content).toContain("poweredByHeader: false");

    // Check for reactStrictMode
    expect(content).toContain("reactStrictMode: true");

    // Check for security headers function
    expect(content).toContain("async headers()");

    // Check for required headers
    expect(content).toContain("X-Content-Type-Options");
    expect(content).toContain("X-Frame-Options");
    expect(content).toContain("Referrer-Policy");
    expect(content).toContain("Strict-Transport-Security");
  });

  it("should set X-Frame-Options to DENY", () => {
    const content = fs.readFileSync(nextConfigPath, "utf-8");
    expect(content).toContain('"DENY"');
  });

  it("should set X-Content-Type-Options to nosniff", () => {
    const content = fs.readFileSync(nextConfigPath, "utf-8");
    expect(content).toContain('"nosniff"');
  });

  it("should set HSTS with secure defaults", () => {
    const content = fs.readFileSync(nextConfigPath, "utf-8");
    expect(content).toContain("Strict-Transport-Security");
    expect(content).toContain("max-age=31536000");
    expect(content).toContain("includeSubDomains");
  });

  it("should NOT include deprecated X-XSS-Protection header", () => {
    const content = fs.readFileSync(nextConfigPath, "utf-8");
    expect(content).not.toContain("X-XSS-Protection");
  });

  it('should use /:path* pattern for i18n compatibility', () => {
    const content = fs.readFileSync(nextConfigPath, "utf-8");
    // /:path* handles i18n correctly, unlike /(.*)
    expect(content).toContain('source: "/:path*"');
  });
});
