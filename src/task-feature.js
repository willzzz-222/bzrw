import {
  SubmitType,
  buildTaskProgressVM,
  createMockStudents,
  defaultTaskDraft,
  formatDueAt,
  progressPercent,
  submitTypeLabel
} from "./state.js";
import { validateTaskDraft } from "./validators.js";

const students = createMockStudents().map((student, index) => ({
  ...student,
  avatar: student.name.slice(-1),
  color: ["#6aa0ef", "#f3a55d", "#58b982", "#ef767a", "#8b7ce8"][index]
}));

const groups = [
  { id: "group_1", name: "三年级信息学算法家长群1", members: 52 },
  { id: "group_2", name: "三年级信息学算法家长群2", members: 48 },
  { id: "group_3", name: "三年级信息学算法补充群", members: 31 },
  { id: "group_4", name: "周末提升班家长群", members: 27 }
];

const publisherName = "韩梅梅老师";

const initialDraft = () => ({
  ...defaultTaskDraft(),
  targetStudentIds: students.map((student) => student.id),
  title: "",
  description: "",
  answer: "",
  startAt: "",
  dueAt: "",
  submitType: SubmitType.IMAGE,
  noReview: false,
  privateSendEnabled: false,
  publishGroupIds: [groups[0].id]
});

const state = {
  draft: initialDraft(),
  tasks: [],
  workspaceTab: "course",
  conversations: [createClassConversation()],
  activeConversationId: "class-room",
  overlay: "",
  toast: "",
  publishMode: "student",
  parentSubmitted: new Set(["s1", "s3", "s5"]),
  currentTaskId: null
};

const els = {
  workspacePage: document.querySelector("#workspace-page"),
  chatListPage: document.querySelector("#chat-list-page"),
  groupChatPage: document.querySelector("#group-chat-page"),
  taskManagePage: document.querySelector("#task-manage-page"),
  qrcodePage: document.querySelector("#qrcode-page"),
  tabWorkspace: document.querySelector("#tab-workspace"),
  tabWorkspaceBack: document.querySelector("#tab-workspace-back"),
  tabChatList: document.querySelector("#tab-chat-list"),
  workspaceTabCourse: document.querySelector("#workspace-tab-course"),
  workspaceTabReview: document.querySelector("#workspace-tab-review"),
  workspacePanelContent: document.querySelector("#workspace-panel-content"),
  workspaceOpenTaskManage: document.querySelector("#workspace-open-task-manage"),
  openGroupChat: document.querySelector("#open-group-chat"),
  backToList: document.querySelector("#back-to-list"),
  openMyQrcode: document.querySelector("#open-my-qrcode"),
  backFromQrcode: document.querySelector("#back-from-qrcode"),
  openTaskManage: document.querySelector("#open-task-manage"),
  backFromManage: document.querySelector("#back-from-manage"),
  manageCreateTask: document.querySelector("#manage-create-task"),
  listMore: document.querySelector("#list-more"),
  moreMenu: document.querySelector("#more-menu"),
  conversationList: document.querySelector(".conversation-list"),
  groupTitle: document.querySelector(".chat-header .title"),
  groupSubtitle: document.querySelector(".chat-header .subtitle"),
  introBubble: document.querySelector(".chat-main .bubble-wrap"),
  overlay: document.querySelector("#task-overlay"),
  taskCardContainer: document.querySelector("#task-card-container"),
  panel: document.querySelector("#chat-panel"),
  inputBar: document.querySelector("#input-bar"),
  togglePanel: document.querySelector("#toggle-panel"),
  triggerTask: document.querySelector("#trigger-task")
};

let panelExpanded = true;
const workspaceCourseHtml = els.workspacePanelContent?.innerHTML || "";

function createClassConversation() {
  return {
    id: "class-room",
    type: "group",
    title: "班级群",
    subtitle: "班级通知",
    avatar: "群",
    color: "#7e899c",
    preview: "今天的班级消息都在这里",
    lastMessageAt: new Date().toISOString(),
    tasks: []
  };
}

function getStudentConversationId(studentId) {
  return `student_${studentId}`;
}

function getStudentConversation(student) {
  return {
    id: getStudentConversationId(student.id),
    type: "student",
    studentId: student.id,
    title: student.name,
    subtitle: student.transferred ? "调入学员 · 私聊" : "学员私聊",
    avatar: student.avatar,
    color: student.color,
    preview: "等待老师发布作业",
    lastMessageAt: "",
    tasks: [],
    unread: 0
  };
}

function getConversationById(id) {
  return state.conversations.find((conversation) => conversation.id === id) || null;
}

function getActiveConversation() {
  return getConversationById(state.activeConversationId) || state.conversations[0] || null;
}

function getPublisherAvatar(name) {
  return String(name || "").replaceAll("老师", "").slice(0, 2) || "教师";
}

function formatChatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function showWorkspacePage() {
  closeOverlay();
  els.workspacePage.classList.remove("hidden-page");
  els.chatListPage.classList.add("hidden-page");
  els.groupChatPage.classList.add("hidden-page");
  els.taskManagePage.classList.add("hidden-page");
  els.qrcodePage.classList.add("hidden-page");
  els.moreMenu.classList.add("hidden");
}

function showChatListPage() {
  closeOverlay();
  els.workspacePage.classList.add("hidden-page");
  els.chatListPage.classList.remove("hidden-page");
  els.groupChatPage.classList.add("hidden-page");
  els.taskManagePage.classList.add("hidden-page");
  els.qrcodePage.classList.add("hidden-page");
  els.moreMenu.classList.add("hidden");
}

function renderWorkspacePanel() {
  if (!els.workspacePanelContent || !els.workspaceTabCourse || !els.workspaceTabReview) return;
  const isCourseTab = state.workspaceTab === "course";
  els.workspaceTabCourse.classList.toggle("active", isCourseTab);
  els.workspaceTabReview.classList.toggle("active", !isCourseTab);
  if (isCourseTab) {
    els.workspacePanelContent.innerHTML = workspaceCourseHtml;
    return;
  }

  if (state.tasks.length === 0) {
    els.workspacePanelContent.innerHTML = `
      <article class="review-task-item empty">
        <span class="review-task-icon">📝</span>
        <span class="review-task-title">暂无已发布任务</span>
        <span class="review-task-count">0</span>
        <span class="review-task-arrow">›</span>
      </article>`;
    return;
  }

  els.workspacePanelContent.innerHTML = state.tasks
    .map((task) => {
      const submittedCount = task.submissions?.size || 0;
      return `
      <article class="review-task-item">
        <span class="review-task-icon">📝</span>
        <span class="review-task-title">${escapeHtml(task.title || "未命名任务")}</span>
        <span class="review-task-count">${submittedCount}</span>
        <span class="review-task-arrow">›</span>
      </article>`;
    })
    .join("");
}

els.tabChatList.addEventListener("click", showChatListPage);
els.tabWorkspace.addEventListener("click", showWorkspacePage);
els.tabWorkspaceBack.addEventListener("click", showWorkspacePage);
els.workspaceTabCourse?.addEventListener("click", () => {
  state.workspaceTab = "course";
  renderWorkspacePanel();
});
els.workspaceTabReview?.addEventListener("click", () => {
  state.workspaceTab = "review";
  renderWorkspacePanel();
});
els.workspaceOpenTaskManage.addEventListener("click", () => {
  closeOverlay();
  els.workspacePage.classList.add("hidden-page");
  els.chatListPage.classList.add("hidden-page");
  els.groupChatPage.classList.add("hidden-page");
  els.qrcodePage.classList.add("hidden-page");
  els.taskManagePage.classList.remove("hidden-page");
});

els.openGroupChat.addEventListener("click", () => {
  state.activeConversationId = "class-room";
  els.workspacePage.classList.add("hidden-page");
  els.chatListPage.classList.add("hidden-page");
  els.groupChatPage.classList.remove("hidden-page");
  els.taskManagePage.classList.add("hidden-page");
  els.qrcodePage.classList.add("hidden-page");
  els.moreMenu.classList.add("hidden");
});

els.backToList.addEventListener("click", () => {
  showChatListPage();
});

els.openTaskManage.addEventListener("click", () => {
  els.moreMenu.classList.add("hidden");
  els.workspacePage.classList.add("hidden-page");
  els.chatListPage.classList.add("hidden-page");
  els.groupChatPage.classList.add("hidden-page");
  els.qrcodePage.classList.add("hidden-page");
  els.taskManagePage.classList.remove("hidden-page");
});

els.openMyQrcode.addEventListener("click", () => {
  els.moreMenu.classList.add("hidden");
  els.workspacePage.classList.add("hidden-page");
  els.chatListPage.classList.add("hidden-page");
  els.groupChatPage.classList.add("hidden-page");
  els.taskManagePage.classList.add("hidden-page");
  els.qrcodePage.classList.remove("hidden-page");
});

els.backFromManage.addEventListener("click", () => {
  showChatListPage();
});

els.backFromQrcode.addEventListener("click", () => {
  showChatListPage();
});

els.manageCreateTask.addEventListener("click", () => {
  openComposeTask({ lockToGroup: true });
});

els.listMore.addEventListener("click", (event) => {
  event.stopPropagation();
  els.moreMenu.classList.toggle("hidden");
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof HTMLElement)) return;
  if (event.target.closest("#more-menu") || event.target.closest("#list-more")) return;
  els.moreMenu.classList.add("hidden");
});

els.togglePanel.addEventListener("click", () => {
  panelExpanded = !panelExpanded;
  els.panel.classList.toggle("collapsed", !panelExpanded);
  els.inputBar.classList.toggle("panel-collapsed", !panelExpanded);
  els.togglePanel.textContent = panelExpanded ? "+" : "×";
});

function openComposeTask({ lockToGroup = false } = {}) {
  state.overlay = "compose";
  state.toast = "";
  state.publishMode = lockToGroup ? "group" : "student";
  if (state.draft.targetStudentIds.length === 0) {
    state.draft.targetStudentIds = students.map((student) => student.id);
  }
  if (state.publishMode === "group") {
    state.draft.targetStudentIds = students.map((student) => student.id);
    state.draft.publishGroupIds = [groups[0].id];
  } else {
    state.draft.publishGroupIds = [];
  }
  renderOverlay();
}

els.triggerTask.addEventListener("click", () => openComposeTask({ lockToGroup: false }));

els.taskCardContainer.addEventListener("click", (event) => {
  const target = event.target instanceof HTMLElement ? event.target.closest("[data-action]") : null;
  if (!(target instanceof HTMLElement)) return;
  if (target.dataset.action !== "open-detail") return;
  const taskId = target.dataset.taskId;
  if (!taskId) return;
  state.currentTaskId = taskId;
  if (!currentTask()) return;
  state.overlay = "detail";
  renderOverlay();
});

els.conversationList?.addEventListener("click", (event) => {
  const target = event.target instanceof HTMLElement ? event.target.closest("[data-action='open-conversation']") : null;
  if (!(target instanceof HTMLElement)) return;
  const id = target.dataset.id;
  if (!id) return;
  state.activeConversationId = id;
  openConversation(id);
});

els.overlay.addEventListener("click", (event) => {
  const target = event.target instanceof HTMLElement ? event.target.closest("[data-action]") : null;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.action;
  if (!action) return;

  if (action === "close") return closeOverlay();

  if (action === "toggle-all" && state.publishMode === "student") {
    const isAll = state.draft.targetStudentIds.length === students.length;
    state.draft.targetStudentIds = isAll ? [] : students.map((student) => student.id);
    renderOverlay();
    return;
  }

  if (action === "toggle-student" && state.publishMode === "student") {
    const id = target.dataset.id;
    if (!id) return;
    const selected = new Set(state.draft.targetStudentIds);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    state.draft.targetStudentIds = [...selected];
    renderOverlay();
    return;
  }

  if (action === "next-compose") {
    if (state.publishMode === "group" && (!state.draft.publishGroupIds || state.draft.publishGroupIds.length === 0)) {
      return setInlineError("请选择群");
    }
    state.overlay = "compose";
    renderOverlay();
    return;
  }

  if (action === "back-students") {
    syncTaskForm();
    state.overlay = "compose";
    renderOverlay();
    return;
  }

  if (action === "open-students") {
    syncTaskForm();
    state.overlay = state.publishMode === "group" ? "groups" : "students";
    renderOverlay();
    return;
  }

  if (action === "toggle-group") {
    const id = target.dataset.id;
    if (!id) return;
    const selected = new Set(state.draft.publishGroupIds || []);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    state.draft.publishGroupIds = [...selected];
    renderOverlay();
    return;
  }

  if (action === "pick-start") {
    const input = els.overlay.querySelector("#task-start");
    input?.showPicker?.();
    input?.click();
    return;
  }

  if (action === "pick-end") {
    const input = els.overlay.querySelector("#task-due");
    input?.showPicker?.();
    input?.click();
    return;
  }

  if (action === "toggle-review") {
    syncTaskForm();
    state.draft.noReview = !state.draft.noReview;
    renderOverlay();
    return;
  }

  if (action === "toggle-private-send") {
    syncTaskForm();
    state.draft.privateSendEnabled = !state.draft.privateSendEnabled;
    renderOverlay();
    return;
  }

  if (action === "cycle-submit-type") {
    syncTaskForm();
    state.draft.submitType =
      state.draft.submitType === SubmitType.IMAGE
        ? SubmitType.VIDEO
        : state.draft.submitType === SubmitType.VIDEO
          ? SubmitType.IMAGE_VIDEO
          : SubmitType.IMAGE;
    renderOverlay();
    return;
  }

  if (action === "preview") {
    syncTaskForm();
    const errors = validateCompose();
    if (errors.length) return setInlineError(errors[0]);
    state.overlay = "confirm";
    renderOverlay();
    return;
  }

  if (action === "back-compose") {
    state.overlay = "compose";
    renderOverlay();
    return;
  }

  if (action === "publish") {
    syncTaskForm();
    const errors = validateCompose();
    if (errors.length) return setInlineError(errors[0]);
    publishTask();
    closeOverlay();
    return;
  }

  if (action === "remind") {
    state.toast = "已向未提交学员家长发送提醒";
    renderOverlay();
  }
});

els.overlay.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (["task-title", "task-desc", "task-answer", "task-start", "task-due"].includes(target.id)) {
    syncTaskForm();
    updateInlineState();
  }
});

els.overlay.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (["task-start", "task-due"].includes(target.id)) {
    syncTaskForm();
    renderOverlay();
  }
});

function closeOverlay() {
  state.overlay = "";
  state.toast = "";
  els.overlay.classList.add("hidden");
  els.overlay.innerHTML = "";
}

function currentTask() {
  if (state.currentTaskId) {
    return state.tasks.find((task) => task.id === state.currentTaskId) || null;
  }
  return state.tasks[0] || null;
}

function syncTaskForm() {
  const title = els.overlay.querySelector("#task-title")?.value;
  const description = els.overlay.querySelector("#task-desc")?.value;
  const answer = els.overlay.querySelector("#task-answer")?.value;
  const startAt = els.overlay.querySelector("#task-start")?.value;
  const dueAt = els.overlay.querySelector("#task-due")?.value;

  if (title !== undefined) state.draft.title = title.trim();
  if (description !== undefined) state.draft.description = description.trim();
  if (answer !== undefined) state.draft.answer = answer.trim();
  if (startAt !== undefined) state.draft.startAt = startAt;
  if (dueAt !== undefined) state.draft.dueAt = dueAt ? new Date(dueAt).toISOString() : "";
}

function validateCompose() {
  const draftForValidation = {
    ...state.draft,
    dueAt: state.draft.dueAt || ""
  };
  const errors = validateTaskDraft(draftForValidation);
  if (!state.draft.description) errors.splice(1, 0, "请输入内容");
  if (!state.draft.startAt) errors.splice(2, 0, "请选择开始时间");
  if (!state.draft.dueAt) errors.splice(3, 0, "请选择结束时间");
  return [...new Set(errors)];
}

function publishTask() {
  const submitted = new Map();
  state.parentSubmitted.forEach((id) => {
    if (state.draft.targetStudentIds.includes(id)) {
      submitted.set(id, new Date(Date.now() - 36 * 60 * 1000).toISOString());
    }
  });

  const publishedTask = {
    id: `task_${Date.now()}`,
    ...state.draft,
    publishedAt: new Date().toISOString(),
    publisherName,
    publishScopeLabel:
      state.publishMode === "group"
        ? (groups
            .filter((group) => (state.draft.publishGroupIds || []).includes(group.id))
            .map((group) => group.name)
            .join("、") || groups[0].name)
        : `${state.draft.targetStudentIds.length}名学员`,
    submissions: submitted
  };

  state.tasks.unshift(publishedTask);
  state.currentTaskId = publishedTask.id;
  if (state.draft.privateSendEnabled) {
    distributeTaskToConversations(publishedTask);
  }

  state.draft = initialDraft();
  renderTaskCards();
  renderConversationList();
  if (state.workspaceTab === "review") renderWorkspacePanel();
}

function renderTaskCards() {
  const conversation = getActiveConversation();
  if (!conversation || conversation.type === "group") {
    els.taskCardContainer.innerHTML = "";
    return;
  }
  const taskIds = new Set(conversation?.tasks || []);
  const visibleTasks = state.tasks.filter((task) => taskIds.has(task.id));

  els.taskCardContainer.innerHTML = visibleTasks
    .map((task) => `
      <div class="task-message">
        <article class="task-card">
          <div class="task-head">
            <span class="task-icon">📝</span>
            <span>学习任务</span>
          </div>
          <div class="task-name">${escapeHtml(task.title)}</div>
          <div class="task-row"><span>开始时间</span><strong>${formatPickerText(task.startAt)}</strong></div>
          <div class="task-row"><span>结束时间</span><strong>${formatDueAt(task.dueAt)}</strong></div>
          <div class="task-row"><span>发布人</span><strong>${escapeHtml(task.publisherName || publisherName)}</strong></div>
          <button class="task-link" type="button" data-action="open-detail" data-task-id="${task.id}">查看详情 ></button>
        </article>
        <div class="avatar task-avatar">${getPublisherAvatar(task.publisherName || publisherName)}</div>
      </div>`)
    .join("");
}

function distributeTaskToConversations(task) {
  const now = task.publishedAt || new Date().toISOString();
  const isClassPublish = state.publishMode === "group";
  if (!isClassPublish) {
    const classConversation = getConversationById("class-room");
    if (classConversation) {
      classConversation.tasks = [task.id, ...classConversation.tasks];
      classConversation.preview = `【作业】${task.title}`;
      classConversation.lastMessageAt = now;
    }
  }

  const selectedStudents = students.filter((student) => task.targetStudentIds.includes(student.id));
  selectedStudents.forEach((student) => {
    const id = getStudentConversationId(student.id);
    let conversation = getConversationById(id);
    if (!conversation) {
      conversation = getStudentConversation(student);
      state.conversations.push(conversation);
    }
    conversation.tasks = [task.id, ...conversation.tasks];
    conversation.preview = `【作业】${task.title}`;
    conversation.lastMessageAt = now;
    conversation.unread = (conversation.unread || 0) + 1;
  });
}

function openConversation(id) {
  const conversation = getConversationById(id);
  if (!conversation) return;
  state.activeConversationId = id;
  conversation.unread = 0;
  renderConversationHeader(conversation);
  renderTaskCards();
  els.workspacePage.classList.add("hidden-page");
  els.chatListPage.classList.add("hidden-page");
  els.groupChatPage.classList.remove("hidden-page");
  els.taskManagePage.classList.add("hidden-page");
  els.qrcodePage.classList.add("hidden-page");
  els.moreMenu.classList.add("hidden");
  renderConversationList();
}

function renderConversationHeader(conversation) {
  if (!els.groupTitle || !els.groupSubtitle) return;
  if (conversation.type === "student") {
    els.groupTitle.textContent = conversation.title;
    els.groupSubtitle.textContent = "家校私聊";
    els.introBubble?.classList.add("hidden");
  } else {
    els.groupTitle.textContent = "班级群";
    els.groupSubtitle.textContent = "班级通知";
    els.introBubble?.classList.remove("hidden");
  }
}

function renderConversationList() {
  if (!els.conversationList) return;
  const sorted = [...state.conversations].sort((a, b) => {
    const ta = new Date(a.lastMessageAt || 0).valueOf();
    const tb = new Date(b.lastMessageAt || 0).valueOf();
    return tb - ta;
  });

  els.conversationList.innerHTML = sorted
    .map((conversation) => `
      <button class="conversation-item dynamic-item" data-action="open-conversation" data-id="${conversation.id}" type="button">
        <span class="${conversation.type === "group" ? "course-avatar gray" : "student-avatar-list"}" ${conversation.type === "group" ? "" : `style="background:${conversation.color}"`}>${conversation.avatar}</span>
        <span class="conversation-copy">
          <strong>${escapeHtml(conversation.title)}</strong>
          <em>${escapeHtml(conversation.preview || " ")}</em>
        </span>
        <span class="conversation-time">${formatChatTime(conversation.lastMessageAt)}</span>
      </button>`)
    .join("");
}

function renderOverlay() {
  if (!state.overlay) return closeOverlay();
  els.overlay.classList.remove("hidden");
  if (state.overlay === "groups") return renderGroups();
  if (state.overlay === "students") return renderStudents();
  if (state.overlay === "compose") return renderCompose();
  if (state.overlay === "confirm") return renderConfirm();
  if (state.overlay === "detail") return renderDetail();
}

function renderGroups() {
  const selectedGroupIds = new Set(state.draft.publishGroupIds || []);
  els.overlay.innerHTML = `
  <div class="assign-page">
    <div class="assign-status">
      <div>9:41</div>
      <div class="assign-icons"><span class="signal"></span><span class="wifi"></span><span class="battery"></span></div>
    </div>
    <div class="assign-head">
      <button class="assign-back" type="button" data-action="back-compose">‹</button>
      <div class="assign-title">选择群</div>
      <span></span>
    </div>

    <div class="assign-scroll">
      <button class="select-all readonly" type="button">
        <span>选择群发布</span>
      </button>
      <div class="student-list">
        ${groups
          .map((group) => {
            const selected = selectedGroupIds.has(group.id);
            return `
        <button class="group-row ${selected ? "selected" : ""}" type="button" data-action="toggle-group" data-id="${group.id}">
          <span class="group-avatar">群</span>
          <span class="student-name">${group.name}</span>
          <span class="group-meta">${group.members}人</span>
          <span class="check ${selected ? "checked" : ""}"></span>
        </button>`;
          })
          .join("")}
      </div>
      <div class="inline-error" id="inline-error"></div>
    </div>

    <div class="assign-footer">
      <div class="selected-count">已选择${selectedGroupIds.size}个群</div>
      <button class="publish-btn" type="button" data-action="next-compose">确定</button>
    </div>
  </div>`;
}

function renderStudents() {
  const selected = new Set(state.draft.targetStudentIds);
  const isAll = selected.size === students.length;
  const readonly = false;

  els.overlay.innerHTML = `
  <div class="assign-page">
    <div class="assign-status">
      <div>9:41</div>
      <div class="assign-icons"><span class="signal"></span><span class="wifi"></span><span class="battery"></span></div>
    </div>
    <div class="assign-head">
      <button class="assign-back" type="button" data-action="back-compose">‹</button>
      <div class="assign-title">发布给</div>
      <span></span>
    </div>

    <div class="assign-scroll">
      <div class="select-hint">支持多选</div>
      ${
        readonly
          ? `<div class="select-all readonly"><span>发布范围：本群全部学员（${students.length}人）</span></div>`
          : `<button class="select-all" type="button" data-action="toggle-all">
              <span class="check ${isAll ? "checked" : ""}"></span>
              <span>全选</span>
            </button>`
      }
      <div class="student-list">
        ${students
          .map((student) => {
            const active = selected.has(student.id);
            return `
            <button class="student-row ${readonly ? "readonly" : ""}" type="button" ${readonly ? "" : `data-action="toggle-student" data-id="${student.id}"`}>
              <span class="student-avatar" style="background:${student.color}">${student.avatar}</span>
              <span class="student-name">${student.name}${student.transferred ? '<i class="tag">调入</i>' : ""}</span>
              ${readonly ? "" : `<span class="check ${active ? "checked" : ""}"></span>`}
            </button>`;
          })
          .join("")}
      </div>
      <div class="inline-error" id="inline-error"></div>
    </div>

    <div class="assign-footer">
      <div class="selected-count">${readonly ? `本群共${students.length}名学员` : `已选择${selected.size}人，可多选`}</div>
      <button class="publish-btn" type="button" data-action="next-compose">${readonly ? "返回" : "确定"}</button>
    </div>
  </div>`;
}

function renderCompose() {
  els.overlay.innerHTML = `
  <div class="assign-page">
    <div class="assign-status">
      <div>9:41</div>
      <div class="assign-icons"><span class="signal"></span><span class="wifi"></span><span class="battery"></span></div>
    </div>
    <div class="assign-head">
      <button class="assign-back" type="button" data-action="close">‹</button>
      <div class="assign-title">布置任务</div>
      <span></span>
    </div>

    <div class="assign-scroll">
      <label class="assign-card title-card">
        <input id="task-title" maxlength="30" placeholder="请输入任务名称" value="${escapeAttr(state.draft.title)}" />
      </label>
      <section class="assign-card content-card">
        <textarea id="task-desc" maxlength="500" placeholder="请输入内容">${escapeHtml(state.draft.description)}</textarea>
        <input id="task-answer" maxlength="200" placeholder="添加答案 +" value="${escapeAttr(state.draft.answer)}" />
        <div class="compose-line"></div>
        <div class="attach-tools" aria-label="附件工具">
          <button type="button" aria-label="图片"><span class="icon-image"></span></button>
          <button type="button" aria-label="拍照"><span class="icon-camera"></span></button>
          <button type="button" aria-label="附件"><span class="icon-clip"></span></button>
        </div>
      </section>
      <section class="assign-card option-card">
        <button type="button" class="option-row" data-action="pick-start">
          <strong>开始时间</strong>
          <span>${formatPickerText(state.draft.startAt)} <i>›</i></span>
        </button>
        <div class="compose-line"></div>
        <button type="button" class="option-row" data-action="pick-end">
          <strong>结束时间</strong>
          <span>${state.draft.dueAt ? formatDueAt(state.draft.dueAt) : "请选择"} <i>›</i></span>
        </button>
      </section>
      <section class="assign-card option-card single publish-to-card">
        <button type="button" class="option-row" data-action="open-students">
          <strong>发布给</strong>
          <span>${state.publishMode === "group"
            ? ((state.draft.publishGroupIds || []).length ? `${(state.draft.publishGroupIds || []).length}个群` : "请选择群")
            : (state.draft.targetStudentIds.length ? `${state.draft.targetStudentIds.length}名学员` : "请选择")} <i>›</i></span>
        </button>
      </section>
      <section class="assign-card option-card single">
        <button type="button" class="option-row" data-action="cycle-submit-type">
          <strong>提交形式</strong>
          <span>${submitTypeLabel(state.draft.submitType)} <i>›</i></span>
        </button>
      </section>
      <section class="assign-card option-card single">
        <button type="button" class="option-row review-row" data-action="toggle-review">
          <strong>无需批改 <em>?</em></strong>
          <span class="review-switch ${state.draft.noReview ? "on" : ""}"><b></b></span>
        </button>
      </section>
      <section class="assign-card option-card single">
        <button type="button" class="option-row review-row" data-action="toggle-private-send">
          <strong>私聊发送 <em>?</em></strong>
          <span class="review-switch ${state.draft.privateSendEnabled ? "on" : ""}"><b></b></span>
        </button>
      </section>
      <input id="task-start" class="hidden-picker" type="datetime-local" value="${state.draft.startAt}" />
      <input id="task-due" class="hidden-picker" type="datetime-local" value="${toDateTimeLocalValue(state.draft.dueAt)}" />
      <div class="inline-error" id="inline-error"></div>
    </div>
    <div class="assign-footer">
      <button class="preview-btn" type="button" data-action="preview">预览</button>
      <button class="publish-btn" type="button" data-action="publish">发布</button>
    </div>
  </div>`;
}

function renderConfirm() {
  els.overlay.innerHTML = `
  <div class="task-page">
    <div class="task-nav">
      <button class="nav-back" type="button" data-action="back-compose">‹</button>
      <div class="nav-title">预览任务</div>
      <button class="nav-close" type="button" data-action="close">×</button>
    </div>
    <div class="task-scroll">
      <div class="confirm-card">
        <div class="confirm-title">${escapeHtml(state.draft.title)}</div>
        <dl>
          <dt>发布对象</dt>
          <dd>${state.publishMode === "group"
            ? ((state.draft.publishGroupIds || []).length ? `${(state.draft.publishGroupIds || []).length}个群` : "请选择群")
            : `${state.draft.targetStudentIds.length}名学员`}</dd>
          <dt>发布人</dt>
          <dd>${publisherName}</dd>
          <dt>开始时间</dt>
          <dd>${formatPickerText(state.draft.startAt)}</dd>
          <dt>结束时间</dt>
          <dd>${formatDueAt(state.draft.dueAt)}</dd>
          <dt>提交形式</dt>
          <dd>${submitTypeLabel(state.draft.submitType)}</dd>
          <dt>无需批改</dt>
          <dd>${state.draft.noReview ? "开启" : "关闭"}</dd>
          <dt>私聊发送</dt>
          <dd>${state.draft.privateSendEnabled ? "开启" : "关闭"}</dd>
        </dl>
      </div>
      <div class="parent-preview">
        <div class="task-head"><span class="task-icon">📝</span><span>${state.draft.privateSendEnabled ? "家长将收到" : "家长不会收到作业卡片"}</span></div>
        <div class="task-name">${escapeHtml(state.draft.title)}</div>
        <div class="task-row"><span>状态</span><strong>${state.draft.privateSendEnabled ? "待提交" : "不发送"}</strong></div>
        <div class="task-link static">${state.draft.privateSendEnabled ? "去完成 >" : "仅发布任务 >"}</div>
      </div>
      <div class="inline-error" id="inline-error"></div>
    </div>
    <div class="task-footer">
      <button class="secondary-btn" type="button" data-action="back-compose">返回编辑</button>
      <button class="primary-btn" type="button" data-action="publish">确认发布</button>
    </div>
  </div>`;
}

function renderDetail() {
  const task = currentTask();
  if (!task) return closeOverlay();
  const progress = buildTaskProgressVM(task, students, task.submissions);
  const percent = progressPercent(progress.submittedCount, progress.totalCount);
  const body = `
    <div class="detail-card">
      <div class="detail-title">${escapeHtml(task.title)}</div>
      <div class="progress-meta">
        <span>提交进度</span>
        <strong>${progress.submittedCount} / ${progress.totalCount}</strong>
      </div>
      <div class="progress"><span style="width:${percent}%"></span></div>
      <div class="percent">${percent}%</div>
    </div>
    ${state.toast ? `<div class="toast">${state.toast}</div>` : ""}
    <section class="detail-section">
      <h3>已提交（${progress.submittedCount}）</h3>
      ${renderDetailRows(progress.submittedList, true)}
    </section>
    <section class="detail-section">
      <h3>未提交（${progress.pendingList.length}）</h3>
      ${renderDetailRows(progress.pendingList, false)}
    </section>`;

  els.overlay.innerHTML = `
  <div class="task-page">
    <div class="task-nav">
      <button class="nav-back" type="button" data-action="close">‹</button>
      <div class="nav-title">任务详情</div>
      <button class="nav-close" type="button" data-action="close">×</button>
    </div>
    <div class="task-scroll">${body}</div>
    <div class="task-footer">
      <button class="secondary-btn" type="button" data-action="close">返回聊天</button>
      <button class="primary-btn" type="button" data-action="remind">提醒未提交</button>
    </div>
  </div>`;
}

function renderDetailRows(list, showTime) {
  if (!list.length) return '<div class="empty">暂无</div>';
  return list
    .map((student) => `
      <div class="detail-row">
        <span class="student-avatar" style="background:${student.color}">${student.avatar}</span>
        <span>${student.name}</span>
        ${showTime ? `<em>${formatDueAt(student.submittedAt)}</em>` : ""}
      </div>`)
    .join("");
}

function updateInlineState() {
  const error = els.overlay.querySelector("#inline-error");
  if (error) error.textContent = "";
}

function setInlineError(message) {
  const error = els.overlay.querySelector("#inline-error");
  if (error) error.textContent = message;
}

function formatPickerText(value) {
  if (!value) return "请选择";
  return value.replace("T", " ");
}

function toDateTimeLocalValue(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.valueOf())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

renderConversationList();
renderConversationHeader(getActiveConversation());
renderTaskCards();
renderWorkspacePanel();


