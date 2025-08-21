import { useState } from 'react'
import './Nav.css'

function Nav({ set_disp, logged_in }) {
  const [open, set_open] = useState(false);

  function clickNav() {
    set_open(prev => !prev);
  }

  const cur_items = ['Expenses', 'Register'];

  if(logged_in.in) {
    cur_items.push('Logout');
  } else {
    cur_items.push('Login');
  }

  let nav_bar = <div className="nav-bar button" onClick={clickNav}/>;

  if(open) {
    const items_list = cur_items.map((name, id) => (
        <button key={id} onClick={() => set_disp(name)}>
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

export default Nav;
