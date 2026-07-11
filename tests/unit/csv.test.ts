import { describe, expect, it } from "vitest";
import { escapeCsvCell, toCsv } from "@/lib/export/csv";

describe("escapeCsvCell", () => {
  it("passes plain values through", () => {
    expect(escapeCsvCell("hello")).toBe("hello");
    expect(escapeCsvCell(42)).toBe("42");
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("quotes cells containing commas, quotes and newlines", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralizes spreadsheet formula injection", () => {
    expect(escapeCsvCell("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(escapeCsvCell("+1234")).toBe("'+1234");
    expect(escapeCsvCell("-cmd")).toBe("'-cmd");
    expect(escapeCsvCell("@evil")).toBe("'@evil");
  });
});

describe("toCsv", () => {
  it("builds CRLF-joined rows with a header", () => {
    const csv = toCsv(["a", "b"], [["1", "x,y"], ["2", "plain"]]);
    expect(csv).toBe('a,b\r\n1,"x,y"\r\n2,plain\r\n');
  });
});
