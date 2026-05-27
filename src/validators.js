import { SubmitType } from "./state.js";

export function validateStudents(ids) {
  if (!ids || ids.length === 0) return "请选择学员";
  return "";
}

export function validateTitle(title) {
  if (!title || !title.trim()) return "请输入任务标题";
  if (title.trim().length > 30) return "任务标题最多30字";
  return "";
}

export function validateDescription(description) {
  if ((description || "").length > 500) return "任务说明最多500字";
  return "";
}

export function validateDueAt(dueAt) {
  const due = new Date(dueAt);
  if (Number.isNaN(due.valueOf())) return "请选择有效截止时间";
  if (due.valueOf() <= Date.now()) return "截止时间需晚于当前时间";
  return "";
}

export function validateSubmitType(type) {
  const valid = [SubmitType.IMAGE, SubmitType.VIDEO, SubmitType.IMAGE_VIDEO];
  return valid.includes(type) ? "" : "请选择有效提交方式";
}

export function validateTaskDraft(draft) {
  return [
    validateStudents(draft.targetStudentIds),
    validateTitle(draft.title),
    validateDescription(draft.description),
    validateDueAt(draft.dueAt),
    validateSubmitType(draft.submitType)
  ].filter(Boolean);
}
