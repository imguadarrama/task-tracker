export const TASK_STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'doing', label: 'Doing' },
  { value: 'done', label: 'Done' },
];

export const STATUS_LABELS = Object.fromEntries(
  TASK_STATUSES.map(({ value, label }) => [value, label]),
);
