import { useState, useEffect } from 'react';
import { auth_header } from '../const';
import { jwtDecode } from 'jwt-decode';

function ExpenseSheet({ token }) {
  const [expenses, set_expenses] = useState([]);
  const [msg_info, set_msg_info] = useState({
    show_msg: true,
    msg: 'Loading Expenses',
    msg_type: 'msg_success'
  });

  useEffect(() => {
    (async function() {
      try {
        const response = await fetch(`/api/get_expenses`, {
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

        if(result.status === 'Ok' || result.status === 'New') {
          if(result.status === 'New') {
            token.current = result.token;

            console.log('token:', result.token);
            console.log('decoded:', jwtDecode(result.token));
          }

          set_expenses(result.data);
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
    const sheet_data = expenses.map(exp => (
      <tr>
        <td>{`\$ ${exp.exp / 100}`}</td>
        <td>{exp.desc}</td>
      </tr>
    ));

    return (
      <table>
        <thead>
          <tr>
            <th>Expense</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {sheet_data}
        </tbody>
      </table>
    );
  }
}

export default ExpenseSheet;
