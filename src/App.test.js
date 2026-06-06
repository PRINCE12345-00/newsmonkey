import { render, screen } from '@testing-library/react';
import App from './App';
import News  from './component/api';


test('renders learn react link', () => {
  render(<App />);
  <news/>
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
