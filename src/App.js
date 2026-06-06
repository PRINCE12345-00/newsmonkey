import React, { useState } from 'react';
import './App.css';
import Nav from './component/nav';
import News from './component/news';

function App() {
  const [category, setCategory] = useState('general');

  return (
    <div className="App">
      <Nav currentCategory={category} onChangeCategory={setCategory} />
      <News category={category} />
    </div>
  );
}

export default App;
