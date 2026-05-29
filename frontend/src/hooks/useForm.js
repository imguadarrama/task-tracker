import { useCallback, useState } from 'react';

export function useForm(initial) {
  const [values, setValues] = useState(initial);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const reset = useCallback(() => setValues(initial), [initial]);

  return { values, handleChange, reset };
}
