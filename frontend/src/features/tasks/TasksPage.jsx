import { useAuth } from '../../context/AuthContext.js';
import Button from '../../components/Button/Button.jsx';
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>Hi, {user.username}</h1>
        <Button variant="secondary" onClick={logout}>
          Log out
        </Button>
      </header>

      <section className={styles.section}>
        <h2 className={styles.heading}>New task</h2>
        <TaskForm initialValues={NEW_TASK} submitLabel="Add task" onSubmit={create} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Your tasks</h2>
        <TaskFilters onApply={setFilters} />
        <TaskList
          tasks={tasks}
          loading={loading}
          error={error}
          onUpdate={update}
          onDelete={remove}
        />
      </section>
    </div>
  );
}
