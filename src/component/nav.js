import React from 'react';

function Nav({ currentCategory = 'general', onChangeCategory = () => {} }) {
  const categories = [
    { id: 'general', label: 'Home' },
    { id: 'business', label: 'Business' },
    { id: 'sports', label: 'Sports' },
    { id: 'technology', label: 'Technology' },
    { id: 'world', label: 'World' },
  ];

  return (
    <header>
      <nav className="topnav">
        <div className="brand">
          <a href="/">NewsMonkey</a>
        </div>
        <ul className="nav-links">
          {categories.map((c) => (
            <li key={c.id}>
              <button
                className={"nav-btn " + (currentCategory === c.id ? 'active' : '')}
                onClick={(e) => {
                  e.preventDefault();
                  onChangeCategory(c.id);
                }}
                aria-pressed={currentCategory === c.id}
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export default Nav;