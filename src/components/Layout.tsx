import { NavLink, Outlet } from 'react-router';

export function Layout() {
  return (
    <>
      <header className="site-header">
        <div className="container site-header__inner">
          <span className="site-title">Trip Splitter</span>
          <nav aria-label="Main">
            {/* NavLink marks the current page with aria-current="page", which the CSS styles. */}
            <ul className="nav-links">
              <li>
                <NavLink to="/" end className="nav-link">
                  Expenses
                </NavLink>
              </li>
              <li>
                <NavLink to="/expenses/new" className="nav-link">
                  Add expense
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
