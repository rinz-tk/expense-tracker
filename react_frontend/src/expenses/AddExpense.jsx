import { useState, useRef } from 'react';
import { auth_header } from '../const';

const nos = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);

function AddExpense({ logged_in, token }) {
  const [exp_info, set_exp_info] = useState({
    exp: '0.00',
    desc: '',
  });

  const [msg_info, set_msg_info] = useState({
    msg: '',
    msg_type: 'msg_success'
  });

  const [neg, set_neg] = useState(false);
  const len = useRef(0);
  const st = useRef(false);

  const [split_list, set_split_list] = useState([]);
  const [new_split, set_new_split] = useState('');

  function save_exp(e) {
    const exp = exp_info.exp;
    const key = e.key;

    if(nos.has(key)) {
      if(!st.current && key !== '0') {
          st.current = true;
      }

      if(!st.current) { return; }

      const nexp = exp.slice(0, -3) + exp[exp.length -2] + '.' + exp[exp.length -1] + key;
      if(len.current < 3) {
        set_exp_info({
          ...exp_info,
          exp: nexp.slice(-4)
        });
      } else {
        set_exp_info({
          ...exp_info,
          exp: nexp
        });
      }

      len.current += 1;

    } else if(key === 'Backspace') {
      if(!st.current) { return; }

      const nexp = exp.slice(0, -3) + exp[exp.length - 2];
      if(len.current <= 3) {
        set_exp_info({
          ...exp_info,
          exp: '0.' + nexp
        });
      } else {
        set_exp_info({
          ...exp_info,
          exp: nexp.slice(0, -2) + '.' + nexp.slice(-2)
        });
      }

      if(len.current > 0) {
        len.current -= 1;

        if(len.current === 0) { st.current = false }
      }
    } else if(key === '-') {
      set_neg(!neg);
    }
  }

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
      desc: exp_info.desc
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
        }

        set_msg_info({
          msg: 'Expense added',
          msg_type: 'msg_success'
        });
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

    try {
      const response = await fetch('/api/validate_username');
    } catch(error) {
      set_msg_info({
        msg: `Error: ${error}`,
        msg_type: 'msg_fail'
      });
    }

    set_split_list((prev) => [...prev, new_split]);
    set_new_split('');

    set_msg_info({
      msg: '',
      msg_type: 'msg_success'
    });
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
            value={(neg ? '- ' : '') + '$ ' + exp_info.exp}
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
          <button type='button' onClick={add_split}>
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
