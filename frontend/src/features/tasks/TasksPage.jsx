import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import Button from '../../components/Button/Button.jsx';
import Modal from '../../components/Modal/Modal.jsx';
import { useTasks } from '../../hooks/useTasks.js';
import TaskForm from './TaskForm.jsx';
import TaskFilters from './TaskFilters.jsx';
import TaskList from './TaskList.jsx';
import styles from './TasksPage.module.scss';

const NEW_TASK = { title: '', description: '', status: 'todo' };

export default function TasksPage() {
  const { user, token, logout } = useAuth();
  const { tasks, loading, error, setFilters, create, update, remove } =
    useTasks(token);
  const [addOpen, setAddOpen] = useState(false);

  async function handleCreate(values) {
    await create(values);
    setAddOpen(false);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>Hi, {user.username}</h1>
        <Button variant="secondary" onClick={logout}>
          Log out
        </Button>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.heading}>Your tasks</h2>
          <Button onClick={() => setAddOpen(true)}>Add task</Button>
        </div>
        <TaskFilters onApply={setFilters} />
        <TaskList
          tasks={tasks}
          loading={loading}
          error={error}
          onUpdate={update}
          onDelete={remove}
        />
      </section>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add task">
        <TaskForm
          initialValues={NEW_TASK}
          submitLabel="Add task"
          onSubmit={handleCreate}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>
    </div>
  );
}
