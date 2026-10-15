import { test, expect } from "@playwright/test";
import { extractRefNumber, getNextProjectRefId, getRefId } from "@/lib/ref-id";
import type { Project } from "@/types/project";

test.describe("Ref ID Generation and Sequential Incrementation", () => {
  test("extractRefNumber parses various ref ID formats and extracts correct numeric value and padding", () => {
    // Exactly like the user's example: ref0002v
    const res1 = extractRefNumber("ref0002v");
    expect(res1).not.toBeNull();
    expect(res1?.num).toBe(2);
    expect(res1?.padLength).toBe(4);
    expect(res1?.digitStr).toBe("0002");

    // Standard uppercase REF0002
    const res2 = extractRefNumber("REF0002");
    expect(res2?.num).toBe(2);
    expect(res2?.padLength).toBe(4);

    // Suffixes and hyphens
    const res3 = extractRefNumber("REF-0005");
    expect(res3?.num).toBe(5);
    expect(res3?.padLength).toBe(4);

    const res4 = extractRefNumber("ref 0012");
    expect(res4?.num).toBe(12);
    expect(res4?.padLength).toBe(4);

    // Raw entity IDs and timestamps must NOT be treated as reference IDs
    expect(extractRefNumber("proj-1791887791922")).toBeNull();
    expect(extractRefNumber("prop-9876543210")).toBeNull();
    expect(extractRefNumber("e8a2a8b9-4d6b-4e6f-8c3b-5a1d7f8e9a0b")).toBeNull();
  });

  test("getNextProjectRefId: when recent is ref0002v, it automatically fills REF0003", () => {
    const projects = [
      {
        id: "proj-1",
        name: "Test Project",
        location: { refId: "ref0002v" },
      },
    ] as unknown as Project[];

    const next = getNextProjectRefId(projects);
    expect(next).toBe("REF0003");
  });

  test("getNextProjectRefId: correctly increments real database projects (REF0001, REF0002) to REF0003", () => {
    const projects = [
      {
        id: "proj-1789910402436",
        name: "Serene Grande",
        location: { refId: "REF0001" },
      },
      {
        id: "proj-1791887791922",
        name: "Dwaraka Heights",
        location: { refId: "REF0002" },
      },
    ] as unknown as Project[];

    const next = getNextProjectRefId(projects);
    expect(next).toBe("REF0003");
  });

  test("getNextProjectRefId: returns REF0001 when no existing projects have reference IDs", () => {
    expect(getNextProjectRefId([])).toBe("REF0001");
    expect(getNextProjectRefId([{ id: "proj-no-ref", name: "No Ref" }] as unknown as Project[])).toBe("REF0001");
  });

  test("getNextProjectRefId: correctly handles number padding across 9 -> 10 and 99 -> 100", () => {
    const projects9 = [{ location: { refId: "REF0009" } }] as unknown as Project[];
    expect(getNextProjectRefId(projects9)).toBe("REF0010");

    const projects99 = [{ location: { refId: "REF0099" } }] as unknown as Project[];
    expect(getNextProjectRefId(projects99)).toBe("REF0100");
  });

  test("getNextProjectRefId: finds greatest ref ID even when list is unsorted", () => {
    const projects = [
      { location: { refId: "REF0001" } },
      { location: { refId: "REF0007" } },
      { location: { refId: "REF0003" } },
    ] as unknown as Project[];

    expect(getNextProjectRefId(projects)).toBe("REF0008");
  });

  test("getNextProjectRefId: handles direct refId, ref_id, and location.refId", () => {
    const p1 = { refId: "REF0004" } as unknown as Project;
    const p2 = { ref_id: "REF0005" } as unknown as Project;
    const p3 = { location: { refId: "REF0006" } } as unknown as Project;

    expect(getNextProjectRefId([p1, p2, p3])).toBe("REF0007");
  });

  test("getNextProjectRefId: skips colliding reference IDs if next candidate is already taken", () => {
    const projects = [
      { location: { refId: "REF0002" } },
      { location: { refId: "REF0003" } },
    ] as unknown as Project[];

    expect(getNextProjectRefId(projects)).toBe("REF0004");
  });
});
