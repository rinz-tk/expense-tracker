import { useState } from 'react';
// import { jwtDecode } from 'jwt-decode';

function LoginWindow({ set_logged_in, set_disp, login_redirect }) {
  const [login_info, set_login_info] = useState({
    username: '',
    password: ''
  });

  const [msg_info, set_msg_info] = useState({
    msg: '',
    msg_type: 'msg_success'
  });

  function save_val(e) {
    const { name, value } = e.target;
    set_login_info({
      ...login_info,
      [name]: value
    });
  }

  async function onSubmit(e) {
    e.preventDefault();

    if(login_info.username === '') {
      set_msg_info({
        msg: 'Empty username',
        msg_type: 'msg_fail'
      });

      return;
    }

    if(login_info.password === '') {
      set_msg_info({
        msg: 'Empty password',
        msg_type: 'msg_fail'
      });

      return;
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(login_info)
      });

      if(!response.ok) {
        const err = await response.text();

        set_msg_info({
          msg: `Error: ${err}`,
          msg_type: 'msg_fail'
        });

        return;
      }

      const data = await response.json();

      if(data.status === 'Ok') {
        // console.log(jwtDecode(data.token));

        set_logged_in({
          in: true,
          usn: login_info.username,
          token: data.token
        });

        set_disp('Logout');
        login_redirect.current = true;

      } else if(data.status === 'NotExist') {
        set_msg_info({
          msg: 'Username does not exist',
          msg_type: 'msg_fail'
        });

      } else if(data.status === 'NotMatch') {
        set_msg_info({
          msg: 'Password is incorrect',
          msg_type: 'msg_fail'
        });

      }

    } catch(error) {
      set_msg_info({
        msg: `Error: ${error}`,
        msg_type: 'msg_fail'
      });
    }
  }

  return (
    <>
      <form className='reg-form' autoComplete='off' onSubmit={onSubmit}>

        <div>
          <label>
            Username
          </label>
          <input
            name='username'
            type='text'
            value={login_info.username}
            onChange={save_val}
          />
        </div>

        <div>
          <label>
            Password
          </label>
          <input
            name='password'
            type='password'
            value={login_info.password}
            onChange={save_val}
          />
        </div>

        <div>
          <button type='submit'>Submit</button>
        </div>
        
      </form>

      <div className={`msg ${msg_info.msg_type}`}>
        {msg_info.msg}
      </div>
    </>
  );
}

export default LoginWindow
