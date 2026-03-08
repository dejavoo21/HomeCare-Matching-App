import { BrowserRouter as Router } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import './App.css';

export function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
