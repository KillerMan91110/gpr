import { render, screen } from '@testing-library/react';
import App from './App';

test('redirects unauthenticated users to login', () => {
  render(<App />);
  const heading = screen.getByText(/iniciar sesión/i);
  expect(heading).toBeInTheDocument();
});
