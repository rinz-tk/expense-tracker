import { useState } from 'react'
import { jwtDecode } from 'jwt-decode';

function RegisterWindow({ set_logged_in, set_disp, login_redirect, token }) {
  const [reg_info, set_reg_info] = useState({
    username: '',
    password: ''
  });

  const [msg_info, set_msg_info] = useState({
    msg: '',
    msg_type: 'msg_success'
  });

  function save_val(e) {
    const { name, value } = e.target;
    set_reg_info({
      ...reg_info,
      [name]: value
    });
  }

  async function onSubmit(e) {
    e.preventDefault();

    if(reg_info.username === '') {
      set_msg_info({
        msg: 'Empty username',
        msg_type: 'msg_fail'
      });

      return;
    }

    if(reg_info.password === '') {
      set_msg_info({
        msg: 'Empty password',
        msg_type: 'msg_fail'
      });

      return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(reg_info)
      });

      if(!response.ok) {
        const err = await response.text();
      
        set_msg_info({
          msg: `Error: ${err}`,
          msg_type: 'msg_fail'
        });

        return;
      }

      const result = await response.json();
      if(result.status == 'Ok') {
        console.log('token:', result.token);
        console.log('decoded:', jwtDecode(result.token));

        token.current = result.token;

        set_logged_in({
          in: true,
          usn: reg_info.username,
        });

        set_disp('Logout');
        login_redirect.current = true;

      } else if(result.status == 'Exists') {
        set_msg_info({
          msg: 'Username already exists',
          msg_type: 'msg_fail'
        })
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
            value={reg_info.username}
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
            value={reg_info.password}
            onChange={save_val}
          />
        </div>

        <div>
          <button type='submit' className='submit'>Submit</button>
        </div>

      </form>

      <div className={`msg ${msg_info.msg_type}`}>
        {msg_info.msg}
      </div>
    </>
  )
}

export default RegisterWindow
