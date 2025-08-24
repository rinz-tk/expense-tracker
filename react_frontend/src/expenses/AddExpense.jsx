import { useState, useRef } from 'react';

const nos = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);

function AddExpense() {
  const [exp_info, set_exp_info] = useState({
    exp: '0.00',
    desc: '',
  });

  const [neg, set_neg] = useState(false);
  const len = useRef(0);
  const st = useRef(false);

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

  function onSubmit(e) {
    e.preventDefault();
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

        <div>
          <button type='submit'>Add Expense</button>
        </div>

      </form>
    </>
  );
}

export default AddExpense;
