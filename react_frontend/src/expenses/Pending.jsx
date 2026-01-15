import { useState, useEffect } from 'react';
import { auth_header } from '../const';
import { number_field } from './AddExpense';

function Pending({ token }) {
  const [pending, set_pending] = useState([]);
  const [msg_info, set_msg_info] = useState({
    show_msg: true,
    msg: 'Loading Pending',
    msg_type: 'msg_success'
  });
  const [freeze, set_freeze] = useState(false);
  const [select_list, set_select_list] = useState([]);

  useEffect(() => {
    get_pending();
  }, []);

  async function get_pending() {
    try {
      const response = await fetch('/api/get_pending', {
        headers: auth_header(token.current),
      });

      if(!response.ok) {
        const err = await response.text();

        set_msg_info({
          show_msg: true,
          msg: `Error: ${err}`,
          msg_type: 'msg_fail'
        });

        return;
      }

      const result = await response.json();
      console.log(result);

      if(result.status === 'Ok') {
        set_pending(result.pending_list);

        const sl = result.pending_list.map(_ => {
          return {
            custom: false,
            exp: '0.00',
            len: 0,
            st: false
          };
        });
        set_select_list(sl);

        set_msg_info({
          ...msg_info,
          show_msg: false
        });

      } else if(result.status === 'Invalid') {
        set_msg_info({
          show_msg: true,
          msg: 'Invalid authentication',
          msg_type: 'msg_fail'
        });
      }

    } catch(error) {
      set_msg_info({
        show_msg: true,
        msg: `Error: ${error}`,
        msg_type: 'msg_fail'
      });
    }
  }

  function select(ind) {
    set_select_list(sl => {
      const sl_updated = [...sl];
      const o = sl_updated[ind];

      sl_updated[ind] = {
        ...o,
        custom: !o.custom
      };

      return sl_updated;
    });
  }

  async function settle(e, ind) {
    e.preventDefault();
    set_freeze(true);

    let exp = null;
    const s = select_list[ind];
    if(s.custom) {
      exp = Number(s.exp.slice(0, -3)) * 100 + Number(s.exp.slice(-2));
    }

    try {
      const response = await fetch('/api/settle_pending', {
        method: 'POST',
        headers: auth_header(token.current),
        body: JSON.stringify({
          target: pending[ind].target_id,
          exp
        })
      });

      if(!response.ok) {
        const err = await response.text();
      
        set_msg_info({
          show_msg: true,
          msg: `Error: ${err}`,
          msg_type: 'msg_fail'
        });

        set_freeze(false);
        return;
      }

      const result = await response.json();
      console.log(result);

      if(result === 'Ok') {
        await get_pending();
      } else if(result === 'Invalid') {
          set_msg_info({
            show_msg: true,
            msg: 'Invalid authentication',
            msg_type: 'msg_fail'
          });
      }

    } catch(error) {
      set_msg_info({
        show_msg: true,
        msg: `Error: ${error}`,
        msg_type: 'msg_fail'
      });
    }

    set_freeze(false);
  }

  if(msg_info.show_msg) {
    return (
      <div className={`msg ${msg_info.msg_type}`}>
        {msg_info.msg}
      </div>
    );

  } else {
    const pending_data = pending.map((pe, ind) => {
      const details = pe.details.map(d => (
        <div>
          <span className='pending-detail-amt'>${d.exp / 100}</span>
          {' for '}
          <span className='pending-detail-desc'>{d.desc}</span>
        </div>
      ));

      return (
        <div className='pending-entry'>
          <div>
            {'You owe '}
            <span className='pending-amt'>${pe.amt / 100}</span>
            {' to '}
            <span className='pending-target'>{pe.target}</span>
            {' '}
            <button className='pending-switch-settle' type='button' onClick={() => select(ind)} disabled={freeze}>&#8203;</button>

            <form className='pending-form' autoComplete='off' onSubmit={(e) => settle(e, ind)}>
              <button className='pending-settle' type='submit' disabled={freeze}>
                {!select_list[ind].custom
                  ?
                    'Settle All'
                  :
                    'Settle Custom'
                }
              </button>
              
              {select_list[ind].custom &&
                <input
                  className='exp-input'
                  name='exp'
                  type='text'
                  value={'$ ' + select_list[ind].exp}
                  onKeyDown={number_field(select_list[ind], (o) => {
                    set_select_list(sl => {
                      const sl_updated = [...sl];
                      sl_updated[ind] = o;

                      return sl_updated;
                    });
                  })}
                />
              }
            </form>
            
          </div>

          <div className='details'>
            {details}
          </div>
        </div>
      );
    });

    return (
      <div className='pending-list'>
        {pending_data}
      </div>
    );
  }
}

export default Pending;
