import { useState, useRef } from 'react';
import { auth_header } from '../const';
import { jwtDecode } from 'jwt-decode';

export function number_field(exp_obj, exp_setter) {
  const nos = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);

  return (e) => {
    let { exp, len, st } = exp_obj;
    const key = e.key;

    if(nos.has(key)) {
      if(!st && key !== '0') {
          st = true;
      }

      if(!st) { return; }

      let nexp = exp.slice(0, -3) + exp[exp.length -2] + '.' + exp[exp.length -1] + key;
      if(len < 3) {
        nexp = nexp.slice(-4);
      }

      exp_setter({
        ...exp_obj,
        exp: nexp,
        len: len + 1,
        st
      });

    } else if(key === 'Backspace') {
      if(!st) { return; }

      let nexp = exp.slice(0, -3) + exp[exp.length - 2];
      if(len <= 3) {
        nexp = '0.' + nexp;
      } else {
        nexp = nexp.slice(0, -2) + '.' + nexp.slice(-2);
      }

      if(len > 0) {
        len -= 1;
        if(len === 0) { st = false }
      }

      exp_setter({
        ...exp_obj,
        exp: nexp,
        len,
        st
      });
    }
  }
}

function AddExpense({ logged_in, token }) {
  const [exp_info, set_exp_info] = useState({
    exp: '0.00',
    desc: '',
    len: 0,
    st: false
  });

  const [msg_info, set_msg_info] = useState({
    msg: '',
    msg_type: 'msg_success'
  });

  const [split_list, set_split_list] = useState([]);
  const [new_split, set_new_split] = useState('');

  const save_exp = number_field(exp_info, set_exp_info);

  function save_val(e) {
    const { name, value } = e.target;
    set_exp_info({
      ...exp_info,
      [name]: value
    });
  }

  async function onSubmit(e) {
    e.preventDefault();

    if(exp_info.exp === '0.00') {
      set_msg_info({
        msg: 'No amount set',
        msg_type: 'msg_fail'
      });

      return;
    }

    const exp = Number(exp_info.exp.slice(0, -3)) * 100 + Number(exp_info.exp.slice(-2));
    const exp_send = {
      exp: exp,
      desc: exp_info.desc,
      split_list
    };

    try {
      const response = await fetch('/api/add_expense', {
        method: 'POST',
        headers: auth_header(token.current),
        body: JSON.stringify(exp_send)
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
      console.log(result);

      if(result.status === 'Ok' || result.status === 'New') {
        if(result.status === 'New') {
          token.current = result.token;

          console.log('token:', result.token);
          console.log('decoded:', jwtDecode(result.token));
        }

        set_msg_info({
          msg: 'Expense added',
          msg_type: 'msg_success'
        });

        set_exp_info({
          exp: '0.00',
          desc: '',
          len: 0,
          st: false
        });

        set_split_list([]);
        set_new_split('');

      } else if(result.status === 'Invalid') {
        set_msg_info({
          msg: 'Invalid authentication',
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

  async function add_split(_) {
    if(new_split === '') {
      set_msg_info({
        msg: 'Enter the username with whom you wish to split the expense',
        msg_type: 'msg_fail'
      });
      return;
    }

    if(new_split === logged_in.usn) {
      set_msg_info({
        msg: 'Cannot enter your own username',
        msg_type: 'msg_fail'
      });
      return;
    }

    if(split_list.includes(new_split)) {
      set_msg_info({
        msg: 'The same user cannot be added twice',
        msg_type: 'msg_fail'
      });
      return;
    }

    const username = new_split;

    try {
      const params = new URLSearchParams({ username });

      const response = await fetch(`/api/validate_username?${params}`, {
        method: 'GET',
        headers: auth_header(token.current)
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
      console.log(result);

      if(result === 'Valid') {
        set_split_list((prev) => [...prev, new_split]);
        set_new_split('');

        set_msg_info({
          msg: `Added user ${username} to the split`,
          msg_type: 'msg_success'
        });

      } else if(result === 'Invalid') {
        set_msg_info({
          msg: `${username} is not a valid username`,
          msg_type: 'msg_fail'
        });

      } else if(result === 'LoggedOut') {
        set_msg_info({
          msg: 'You must be logged in to add splits',
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

  function split_list_display() {
    if(split_list.length === 0) { return <></>; }

    const sl_disp = split_list.slice(1).map((name) => (
      <div className="item rest">
        {name}
      </div>
    ));

    return (
      <div className="split-list">
        <div>
          <span className="label">Splitting with</span>
          <span className="item">{split_list[0]}</span>
        </div>
        {sl_disp}
      </div>
    );
  }

  return (
    <>
      <form className='reg-form' autoComplete='off' onSubmit={onSubmit}>

        <div>
          <label>
            Expense
          </label>
          <input
            className='exp-input'
            name='exp'
            type='text'
            value={'$ ' + exp_info.exp}
            onKeyDown={save_exp}
          />
        </div>

        <div>
          <label>
            Description
          </label>
          <input
            name='desc'
            type='text'
            value={exp_info.desc}
            onChange={save_val}
          />
        </div>

        {split_list_display()}

        <div className='split'>
          <button type='button' onClick={add_split} disabled={!logged_in.in}>
            Split With
          </button>
          {logged_in.in ?
            <input
              name='new_split'
              type='text'
              value={new_split}
              onChange={(e) => set_new_split(e.target.value)}
            />
           :
            <input
              value="Login Required"
            disabled />
          }
        </div>

        <div>
          <button type='submit' className='submit'>Add Expense</button>
        </div>

      </form>

      <div className={`msg ${msg_info.msg_type}`}>
        {msg_info.msg}
      </div>
    </>
  );
}

export default AddExpense;
