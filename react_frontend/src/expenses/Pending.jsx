import { useState, useEffect } from 'react';
import { auth_header } from '../const';

function Pending({ token }) {
  const [pending, set_pending] = useState([]);
  const [msg_info, set_msg_info] = useState({
    show_msg: true,
    msg: 'Loading Pending',
    msg_type: 'msg_success'
  });

  useEffect(() => {
    (async function() {
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
    }());
  }, []);

  if(msg_info.show_msg) {
    return (
      <div className={`msg ${msg_info.msg_type}`}>
        {msg_info.msg}
      </div>
    );

  } else {
    return (
      <>You owe this to this</>
    );
  }
}

export default Pending;
