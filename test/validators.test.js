import { describe, expect, it } from "vitest";
import { SubmitType, defaultTaskDraft } from "../src/state.js";
import {
  validateDescription,
  validateDueAt,
  validateStudents,
  validateTaskDraft,
  validateTitle
} from "../src/validators.js";

describe("task validators", () => {
  it("rejects empty student selection", () => {
    expect(validateStudents([])).toBe("请选择学员");
  });

  it("enforces title rules", () => {
    expect(validateTitle("")).toBe("请输入任务标题");
    expect(validateTitle("a".repeat(31))).toBe("任务标题最多30字");
    expect(validateTitle("朗读第3课")).toBe("");
  });

  it("enforces description and due time", () => {
    expect(validateDescription("a".repeat(501))).toBe("任务说明最多500字");
    expect(validateDueAt("invalid")).toBe("请选择有效截止时间");
  });

  it("validates complete task draft", () => {
    const draft = defaultTaskDraft();
    draft.targetStudentIds = ["s1"];
    draft.title = "朗读第3课";
    draft.submitType = SubmitType.IMAGE_VIDEO;
    draft.dueAt = new Date(Date.now() + 3600_000).toISOString();
    expect(validateTaskDraft(draft)).toEqual([]);
  });
});
