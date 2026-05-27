import {
  ChatRole,
  SubmitType,
  buildTaskCardVM,
  buildTaskProgressVM,
  createMockStudents,
  defaultTaskDraft,
  formatDueAt,
  progressPercent,
  submitTypeLabel
} from "./state.js";
import { validateStudents, validateTaskDraft } from "./validators.js";

const app = document.querySelector("#app");
const students = createMockStudents();

const state = {
  role: ChatRole.TEACHER,
  view: "chat",
  step: 1,
  draft: defaultTaskDraft(),
  tasks: [],
  currentTaskId: null,
  parentSelectedStudentId: students[0].id,
  error: "",
  info: ""
};

function uid() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function setView(view, step = 1) {
  state.view = view;
  state.step = step;
  state.error = "";
  state.info = "";
  render();
}

function renderHeader() {
  return `
  <section class="header">
    群聊 - 亚丽
    <div class="sub">【寒假】二年级信息学算法班</div>
  </section>`;
}

function getCurrentTask() {
  return state.tasks.find((x) => x.id === state.currentTaskId) || null;
}

function renderChat() {
  const latestTask = state.tasks[0];
  const teacherCard = latestTask
    ? `<article class="card" id="group-task-card">
      <div class="card-title">📝 学习任务</div>
      <div>${latestTask.title}</div>
      <div class="small">发布对象：${latestTask.targetStudentIds.length}名学员</div>
      <div class="small">截止时间：${formatDueAt(latestTask.dueAt)}</div>
      <div class="card-link" data-action="open-teacher-detail" data-task="${latestTask.id}">查看详情 ></div>
    </article>`
    : "";

  const parentCards = state.tasks
    .slice(0, 1)
    .map((task) => {
      const sub = task.submissions.get(state.parentSelectedStudentId) ? "已提交" : "待提交";
      const vm = buildTaskCardVM(task, sub);
      return `<article class="card">
        <div class="card-title">家长单聊卡片</div>
        <div>${vm.title}</div>
        <div class="small">截止时间：${formatDueAt(vm.dueAt)}</div>
        <div class="small">状态：${vm.submitStatus}</div>
        <div class="card-link" data-action="open-parent-entry" data-task="${vm.taskId}">${vm.entryAction} ></div>
      </article>`;
    })
    .join("");

  app.innerHTML = `
  ${renderHeader()}
  <section class="screen">
    <div class="top-tools">
      <button class="btn" data-action="switch-role" data-role="teacher">教师视角</button>
      <button class="btn" data-action="switch-role" data-role="parent">家长视角</button>
    </div>
    <div class="chat-card">各位家长大家好，寒假课程本周就要开课啦！</div>
    ${teacherCard}
    ${state.role === ChatRole.PARENT ? parentCards : ""}
  </section>
  <section class="panel">
    <div class="grid">
      <div class="action">图片</div>
      <div class="action">拍照</div>
      <div class="action">录制视频</div>
      <div class="action">语音通话</div>
      <div class="action">文件</div>
      <div class="action">位置</div>
      <div class="action">发小红花</div>
      <button class="action primary" data-action="start-task">发布任务</button>
    </div>
  </section>`;
}

function studentRow(student) {
  const checked = state.draft.targetStudentIds.includes(student.id);
  return `<div class="row">
    <div>
      ${student.name}${student.transferred ? '<span class="tag">调入</span>' : ""}
    </div>
    <input type="checkbox" data-action="toggle-student" data-id="${student.id}" ${checked ? "checked" : ""} />
  </div>`;
}

function renderSelectStudents() {
  const allSelected = state.draft.targetStudentIds.length === students.length;
  const selectedCount = state.draft.targetStudentIds.length;
  app.innerHTML = `
  <section class="header">发布任务 - 选择学员</section>
  <section class="screen">
    <div class="row" style="margin:12px 16px 0;">
      <div>全选</div>
      <input type="checkbox" data-action="toggle-all" ${allSelected ? "checked" : ""} />
    </div>
    <section class="list">${students.map(studentRow).join("")}</section>
    ${state.error ? `<div class="error">${state.error}</div>` : ""}
  </section>
  <section class="footer">
    <button class="btn" data-action="cancel-flow">取消</button>
    <button class="btn main" data-action="next-step">已选择${selectedCount}人，下一步</button>
  </section>`;
}

function renderFillTask() {
  const draft = state.draft;
  app.innerHTML = `
  <section class="header">发布任务 - 填写任务</section>
  <section class="screen">
    <div class="field">
      <label>任务标题（必填，最多30字）</label>
      <input id="task-title" maxlength="30" value="${draft.title}" />
    </div>
    <div class="field">
      <label>任务说明（选填，最多500字）</label>
      <textarea id="task-desc" maxlength="500">${draft.description || ""}</textarea>
    </div>
    <div class="field">
      <label>截止时间</label>
      <input id="task-due" type="datetime-local" value="${toDateTimeLocalValue(draft.dueAt)}" />
    </div>
    <div class="field">
      <label>附件（图片/视频，使用逗号分隔URL）</label>
      <input id="task-attachments" value="${(draft.attachments || []).map((x) => x.url).join(",")}" />
    </div>
    <div class="field">
      <label>提交方式</label>
      <select id="task-type">
        <option value="${SubmitType.IMAGE}" ${draft.submitType === SubmitType.IMAGE ? "selected" : ""}>图片</option>
        <option value="${SubmitType.VIDEO}" ${draft.submitType === SubmitType.VIDEO ? "selected" : ""}>视频</option>
        <option value="${SubmitType.IMAGE_VIDEO}" ${draft.submitType === SubmitType.IMAGE_VIDEO ? "selected" : ""}>图片+视频</option>
      </select>
    </div>
    ${state.error ? `<div class="error">${state.error}</div>` : ""}
  </section>
  <section class="footer">
    <button class="btn" data-action="prev-step">上一步</button>
    <button class="btn main" data-action="go-confirm">发布任务</button>
  </section>`;
}

function renderConfirm() {
  const draft = state.draft;
  app.innerHTML = `
  <section class="header">发布任务 - 确认发布</section>
  <section class="screen">
    <article class="card">
      <div class="card-title">任务摘要</div>
      <div class="small">任务标题</div><div>${draft.title}</div>
      <div class="small">发布对象</div><div>${draft.targetStudentIds.length}名学员</div>
      <div class="small">截止时间</div><div>${formatDueAt(draft.dueAt)}</div>
      <div class="small">提交方式</div><div>${submitTypeLabel(draft.submitType)}</div>
    </article>
    ${state.error ? `<div class="error">${state.error}</div>` : ""}
  </section>
  <section class="footer">
    <button class="btn" data-action="cancel-flow">取消</button>
    <button class="btn main" data-action="confirm-publish">确认发布</button>
  </section>`;
}

function renderTeacherDetail(task) {
  const progress = buildTaskProgressVM(task, students, task.submissions);
  const percent = progressPercent(progress.submittedCount, progress.totalCount);
  app.innerHTML = `
  <section class="header">任务详情（教师）</section>
  <section class="screen">
    <article class="card">
      <div class="card-title">${task.title}</div>
      <div class="small">提交进度 ${progress.submittedCount} / ${progress.totalCount}</div>
      <div class="progress"><div class="bar" style="width:${percent}%"></div></div>
      <div class="small">${percent}%</div>
    </article>
    <div class="segment-title">已提交（${progress.submittedCount}）</div>
    ${progress.submittedList.map((s) => `<div class="list-line">${s.name} · ${formatDueAt(s.submittedAt)}</div>`).join("") || '<div class="list-line">暂无</div>'}
    <div class="segment-title">未提交（${progress.pendingList.length}）</div>
    ${progress.pendingList.map((s) => `<div class="list-line">${s.name}</div>`).join("") || '<div class="list-line">暂无</div>'}
    ${state.info ? `<div class="error" style="color:#147d3f;">${state.info}</div>` : ""}
  </section>
  <section class="footer">
    <button class="btn" data-action="back-chat">返回群聊</button>
    <button class="btn main" data-action="remind-pending">提醒未提交</button>
  </section>`;
}

function renderParentSubmit(task) {
  const submitted = task.submissions.has(state.parentSelectedStudentId);
  const canImage = [SubmitType.IMAGE, SubmitType.IMAGE_VIDEO].includes(task.submitType);
  const canVideo = [SubmitType.VIDEO, SubmitType.IMAGE_VIDEO].includes(task.submitType);
  app.innerHTML = `
  <section class="header">任务提交（家长）</section>
  <section class="screen">
    <article class="card">
      <div class="card-title">${task.title}</div>
      <div class="small">截止时间：${formatDueAt(task.dueAt)}</div>
      <div class="small">提交方式：${submitTypeLabel(task.submitType)}</div>
      <div class="small">状态：${submitted ? "已提交" : "待提交"}</div>
    </article>
    <div class="field">
      <label>图片上传 ${canImage ? "（可提交）" : "（此任务不支持）"}</label>
      <input id="parent-image" ${canImage ? "" : "disabled"} placeholder="图片链接" />
    </div>
    <div class="field">
      <label>视频上传 ${canVideo ? "（可提交）" : "（此任务不支持）"}</label>
      <input id="parent-video" ${canVideo ? "" : "disabled"} placeholder="视频链接" />
    </div>
    ${state.error ? `<div class="error">${state.error}</div>` : ""}
    ${state.info ? `<div class="error" style="color:#147d3f;">${state.info}</div>` : ""}
  </section>
  <section class="footer">
    <button class="btn" data-action="back-chat">返回群聊</button>
    <button class="btn main" data-action="submit-parent-task" ${submitted ? "disabled" : ""}>提交任务</button>
  </section>`;
}

function renderParentDetail(task) {
  const submitted = task.submissions.has(state.parentSelectedStudentId);
  app.innerHTML = `
  <section class="header">任务详情（家长）</section>
  <section class="screen">
    <article class="card">
      <div class="card-title">${task.title}</div>
      <div class="small">截止时间：${formatDueAt(task.dueAt)}</div>
      <div class="small">状态：${submitted ? "已提交" : "待提交"}</div>
    </article>
  </section>
  <section class="footer">
    <button class="btn main" data-action="back-chat">返回群聊</button>
  </section>`;
}

function render() {
  if (state.view === "chat") return renderChat();
  if (state.view === "create" && state.step === 1) return renderSelectStudents();
  if (state.view === "create" && state.step === 2) return renderFillTask();
  if (state.view === "create" && state.step === 3) return renderConfirm();
  if (state.view === "teacher-detail") return renderTeacherDetail(getCurrentTask());
  if (state.view === "parent-submit") return renderParentSubmit(getCurrentTask());
  if (state.view === "parent-detail") return renderParentDetail(getCurrentTask());
}

function toDateTimeLocalValue(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.valueOf())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function captureTaskDraft() {
  const title = document.querySelector("#task-title")?.value || "";
  const description = document.querySelector("#task-desc")?.value || "";
  const dueAtRaw = document.querySelector("#task-due")?.value || "";
  const dueAt = dueAtRaw ? new Date(dueAtRaw).toISOString() : "";
  const submitType = document.querySelector("#task-type")?.value || SubmitType.IMAGE;
  const attachmentsRaw = document.querySelector("#task-attachments")?.value || "";
  const attachments = attachmentsRaw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((url, idx) => ({
      id: `a${idx + 1}`,
      type: url.includes(".mp4") ? "video" : "image",
      url
    }));

  state.draft = {
    ...state.draft,
    title,
    description,
    dueAt,
    submitType,
    attachments
  };
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.action;
  if (!action) return;

  if (action === "start-task") {
    state.draft = defaultTaskDraft();
    setView("create", 1);
    return;
  }
  if (action === "cancel-flow") {
    setView("chat");
    return;
  }
  if (action === "toggle-all") {
    state.draft.targetStudentIds = target.checked ? students.map((x) => x.id) : [];
    render();
    return;
  }
  if (action === "toggle-student") {
    const id = target.dataset.id;
    if (!id) return;
    const set = new Set(state.draft.targetStudentIds);
    if (target.checked) set.add(id);
    else set.delete(id);
    state.draft.targetStudentIds = [...set];
    render();
    return;
  }
  if (action === "next-step") {
    const error = validateStudents(state.draft.targetStudentIds);
    if (error) {
      state.error = error;
      render();
      return;
    }
    setView("create", 2);
    return;
  }
  if (action === "prev-step") {
    setView("create", 1);
    return;
  }
  if (action === "go-confirm") {
    captureTaskDraft();
    const errs = validateTaskDraft(state.draft);
    if (errs.length > 0) {
      state.error = errs[0];
      render();
      return;
    }
    setView("create", 3);
    return;
  }
  if (action === "confirm-publish") {
    try {
      const task = {
        id: uid(),
        ...state.draft,
        status: "待提交",
        submissions: new Map()
      };
      state.tasks.unshift(task);
      state.currentTaskId = task.id;
      setView("chat");
    } catch (error) {
      state.error = "发布失败，请重试";
      render();
    }
    return;
  }
  if (action === "open-teacher-detail") {
    state.currentTaskId = target.dataset.task || null;
    setView("teacher-detail");
    return;
  }
  if (action === "remind-pending") {
    state.info = "已发送提醒";
    render();
    return;
  }
  if (action === "back-chat") {
    setView("chat");
    return;
  }
  if (action === "switch-role") {
    state.role = target.dataset.role === "parent" ? ChatRole.PARENT : ChatRole.TEACHER;
    render();
    return;
  }
  if (action === "open-parent-entry") {
    state.currentTaskId = target.dataset.task || null;
    const task = getCurrentTask();
    if (!task) return;
    if (task.submissions.has(state.parentSelectedStudentId)) setView("parent-detail");
    else setView("parent-submit");
    return;
  }
  if (action === "submit-parent-task") {
    const task = getCurrentTask();
    if (!task) return;
    const image = document.querySelector("#parent-image")?.value || "";
    const video = document.querySelector("#parent-video")?.value || "";
    const needImage = [SubmitType.IMAGE, SubmitType.IMAGE_VIDEO].includes(task.submitType);
    const needVideo = [SubmitType.VIDEO, SubmitType.IMAGE_VIDEO].includes(task.submitType);
    if ((needImage && !image) || (needVideo && !video)) {
      state.error = "请按要求完成提交";
      render();
      return;
    }
    task.submissions.set(state.parentSelectedStudentId, new Date().toISOString());
    state.error = "";
    state.info = "提交成功";
    render();
  }
});

render();
