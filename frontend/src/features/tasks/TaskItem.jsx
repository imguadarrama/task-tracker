import { useState } from 'react';
import Button from '../../components/Button/Button.jsx';
import FormError from '../../components/FormError/FormError.jsx';
import TaskForm from './TaskForm.jsx';
import { STATUS_LABELS } from './statuses.js';
import styles from './TaskItem.module.scss';

export default function TaskItem({ task, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave(values) {
    await onUpdate(task.id, values);
    setEditing(false);
  }

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      await onDelete(task.id);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <li className={styles.item}>
        <TaskForm
          initialValues={{
            title: task.title,
            description: task.description,
            status: task.status,
          }}
          submitLabel="Save"
          onSubmit={handleSave}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className={styles.item}>
      <div className={styles.header}>
        <h3 className={styles.title}>{task.title}</h3>
        <span className={styles.status}>{STATUS_LABELS[task.status]}</span>
      </div>
      {task.description && <p className={styles.description}>{task.description}</p>}
      <FormError message={error} />
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => setEditing(true)} disabled={deleting}>
          Edit
        </Button>
        <Button variant="secondary" onClick={handleDelete} loading={deleting}>
          Delete
        </Button>
      </div>
    </li>
  );
}
