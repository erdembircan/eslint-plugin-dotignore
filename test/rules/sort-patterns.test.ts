import { describe } from "vitest";
import rule from "../../src/rules/sort-patterns.js";
import { ruleTester } from "../utils/rule-tester.js";

describe("sort-patterns", () => {
  ruleTester.run("sort-patterns", rule, {
    valid: [
      "apple\nbanana\ncherry\n",
      "apple\n",
      "",
      // Sorted runs on both sides of a negated barrier.
      "apple\nbanana\n!x\ncherry\ndate\n",
      { code: "cherry\nbanana\napple\n", options: [{ direction: "desc", caseSensitive: false, natural: true }] },
      { code: "file2\nfile10\n", options: [{ direction: "asc", caseSensitive: false, natural: true }] },
    ],
    invalid: [
      {
        code: "banana\napple\n",
        errors: [{ messageId: "unsorted", data: { current: "apple", previous: "banana" } }],
        output: "apple\nbanana\n",
      },
      {
        // Two separate runs, both unsorted, separated by a negated
        // barrier: one report per run, both fixed in a single pass (the
        // fix ranges aren't adjacent, unlike the Phase 4/5 touching-range
        // cases).
        code: "banana\napple\n!x\ndate\ncherry\n",
        errors: [
          { messageId: "unsorted", data: { current: "apple", previous: "banana" } },
          { messageId: "unsorted", data: { current: "cherry", previous: "date" } },
        ],
        output: "apple\nbanana\n!x\ncherry\ndate\n",
      },
      {
        code: "apple\nbanana\n",
        options: [{ direction: "desc", caseSensitive: false, natural: true }],
        errors: [{ messageId: "unsorted", data: { current: "banana", previous: "apple" } }],
        output: "banana\napple\n",
      },
      {
        // Natural ordering: "file10" must come after "file2".
        code: "file10\nfile2\n",
        errors: [{ messageId: "unsorted", data: { current: "file2", previous: "file10" } }],
        output: "file2\nfile10\n",
      },
      {
        code: "banana\nApple\n",
        options: [{ direction: "asc", caseSensitive: true, natural: true }],
        errors: [{ messageId: "unsorted", data: { current: "Apple", previous: "banana" } }],
        output: "Apple\nbanana\n",
      },
      {
        // A comment splits the file into two separate blocks, each
        // unsorted and checked (and fixed) independently.
        code: "banana\napple\n# comment\ndate\ncherry\n",
        errors: [
          { messageId: "unsorted", data: { current: "apple", previous: "banana" } },
          { messageId: "unsorted", data: { current: "cherry", previous: "date" } },
        ],
        output: "apple\nbanana\n# comment\ncherry\ndate\n",
      },
    ],
  });
});
