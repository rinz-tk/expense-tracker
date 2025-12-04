import { useState, useEffect } from 'react';
import { auth_header } from '../const';

function Pending({ token }) {
  const [pending, set_pending] = useState([]);
  const [msg_info, set_msg_info] = useState({
    show_msg: true,
    msg: 'Loading Pending',
    msg_type: 'msg_success'
  });
  const [freeze, set_freeze] = useState(false);

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

  async function settle(ind) {
    set_freeze(true);

    try {
      const response = await fetch('/api/settle_pending', {
        method: 'POST',
        headers: auth_header(token.current),
        body: JSON.stringify({
          target: pending[ind].target_id
        })
      });

      if(!response.ok) {
        const err = await response.text();
      
        set_msg_info({
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
    const pending_data = pending.map((pe, ind) => (
      <div>
        {'You owe '}
        <span className='pending-amt'>${pe.amt / 100}</span>
        {' to '}
        <span className='pending-target'>{pe.target}</span>
        {" "}
        <button type='button' onClick={() => settle(ind)} disabled={freeze}>Settle</button>
      </div>
    ));

    return (
      <div className='pending-list'>
        {pending_data}
      </div>
    );
  }
}

export default Pending;
