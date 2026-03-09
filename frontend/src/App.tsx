import { BrowserRouter as Router } from 'react-router-dom';
import { AssistantActionsProvider } from './contexts/AssistantActionsContext';
import { AppRoutes } from './routes/AppRoutes';
import './App.css';

export function App() {
  return (
    <Router>
      <AssistantActionsProvider onActions={() => {}}>
        <AppRoutes />
      </AssistantActionsProvider>
    </Router>
  );
}

export default App;
