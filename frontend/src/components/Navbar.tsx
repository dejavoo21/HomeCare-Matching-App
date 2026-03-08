import { useAuth } from '../contexts/AuthContext';
import '../index.css';

export function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="topbar">
      <div className="topbarInner">
        <div className="topbarLeft">
          <div className="topbarBrandBlock">
            <span className="topbarBrandMark" aria-hidden="true">HC</span>
            <span className="topbarBrandText">Homecare Matching App</span>
          </div>
        </div>

        <div className="topbarRight">
          <div className="topbarUser">
            {user.name} ({user.role})
          </div>

          <button onClick={logout} className="btn btn-topbar" type="button">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
