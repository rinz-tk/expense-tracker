import { useState } from 'react'
import './Nav.css'

function Nav({ disp, set_disp, logged_in }) {
  const [open, set_open] = useState(true);

  function clickNav() {
    set_open(prev => !prev);
  }

  const items = ['Expenses'];

  if(logged_in.in) {
    items.push('Logout');
  } else {
    items.push('Login');
    items.push('Register');
  }

  const items_list = items.map((name, id) => (
      <button className={name === disp ? 'highlighted' : ''} key={id} onClick={() => set_disp(name)}>
        <span className={open ? 'open' : 'close'}>
          {name}
        </span>
      </button>
    )
  );

  let nav_bar = (
    <>
      <div className={`nav-bar window ${open ? 'open' : 'close'}`}>
        {items_list}
      </div>
      <div className="nav-bar button" onClick={clickNav}/>
    </>
  );


  return nav_bar;
}

export default Nav;
