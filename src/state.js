export const SubmitType = {
  IMAGE: "image",
  VIDEO: "video",
  IMAGE_VIDEO: "image_video"
};

export const ChatRole = {
  TEACHER: "teacher",
  PARENT: "parent"
};

export function defaultTaskDraft() {
  const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return {
    targetStudentIds: [],
    title: "",
    description: "",
    dueAt,
    submitType: SubmitType.IMAGE,
    attachments: []
  };
}

export function createMockStudents() {
  return [
    { id: "s1", name: "王小明", transferred: false },
    { id: "s2", name: "韩梅梅", transferred: true },
    { id: "s3", name: "李雷", transferred: false },
    { id: "s4", name: "赵子涵", transferred: false },
    { id: "s5", name: "陈思雨", transferred: true }
  ];
}

export function submitTypeLabel(type) {
  if (type === SubmitType.VIDEO) return "视频";
  if (type === SubmitType.IMAGE_VIDEO) return "图片+视频";
  return "图片";
}

export function formatDueAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "--";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

export function progressPercent(submittedCount, totalCount) {
  if (!totalCount) return 0;
  return Math.round((submittedCount / totalCount) * 100);
}

export function buildTaskCardVM(task, submitStatus = "待提交") {
  return {
    taskId: task.id,
    title: task.title,
    targetCount: task.targetStudentIds.length,
    dueAt: task.dueAt,
    submitStatus,
    entryAction: submitStatus === "待提交" ? "去完成" : "查看详情"
  };
}

export function buildTaskProgressVM(task, students, submittedMap) {
  const submittedList = [];
  const pendingList = [];
  task.targetStudentIds.forEach((id) => {
    const student = students.find((x) => x.id === id);
    if (!student) return;
    if (submittedMap.has(id)) {
      submittedList.push({ ...student, submittedAt: submittedMap.get(id) });
    } else {
      pendingList.push(student);
    }
  });
  return {
    taskId: task.id,
    submittedCount: submittedList.length,
    totalCount: task.targetStudentIds.length,
    submittedList,
    pendingList
  };
}
