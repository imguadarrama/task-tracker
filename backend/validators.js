export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export const TASK_STATUSES = ["todo", "doing", "done"];

export function isValidStatus(value) {
  return TASK_STATUSES.includes(value);
}
