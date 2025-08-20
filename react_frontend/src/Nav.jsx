import './Nav.css'
import RegisterWindow from './register/Register.jsx'
import LoginWindow from './login/Login.jsx'
import { useState, useEffect } from 'react'

function Home() {
  return (<></>);
}

const items = {
  Home: Home,
  Register: RegisterWindow,
  Login: LoginWindow,
};

function Nav({ set_disp }) {
  const [open, set_open] = useState(false);

  useEffect(() => {
    set_disp_window('Home');
  }, []);

  function clickNav() {
    set_open(prev => !prev);
  }

  function set_disp_window(name) {
    const Elem = items[name];

    set_disp(
        <>
          <div className="header">{name}</div>
          <Elem/>
        </>
    );
  }

  let nav_bar = <div className="nav-bar button" onClick={clickNav}/>;

  if(open) {
    const items_list = Object.keys(items).map((name, id) => (
        <button key={id} onClick={() => set_disp_window(name)}>
          {name}
        </button>
      )
    );

    nav_bar = (
      <>
        <div className="nav-bar window">
          {items_list}
        </div>
        {nav_bar}
      </>
    );
  }

  return nav_bar;
}

export default Nav
