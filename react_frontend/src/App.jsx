import { useState, useEffect } from 'react'
import './App.css'
import Nav from './Nav.jsx'
import RegisterWindow from './register/Register.jsx'
import LoginWindow from './login/Login.jsx'
import LogoutWindow from './login/Logout.jsx'

function Home() {
  return (<></>);
}

function App() {
  const [disp, set_disp] = useState('Expenses');
  const [logged_in, set_logged_in] = useState({
    in: false,
    usn: '',
    token: ''
  });

  const items = {
    Expenses: {
      Elem: Home,
      props: {}
    },
    Register: {
      Elem: RegisterWindow,
      props: {}
    },
    Logout: {
      Elem: LogoutWindow,
      props: { logged_in, set_logged_in, set_disp }
    },
    Login: {
      Elem: LoginWindow,
      props: { set_logged_in, set_disp }
    }
  };

  function set_disp_window() {
    const { Elem, props } = items[disp];

    return (
        <>
          <div className="header">{disp}</div>
          <Elem {...props} />
        </>
    );
  }

  return (
    <>
      <div id="app">
        <Nav set_disp={set_disp} logged_in={logged_in}/>
        <div id="disp">
          {set_disp_window()}
        </div>
      </div>
    </>
  )
}

export default App
