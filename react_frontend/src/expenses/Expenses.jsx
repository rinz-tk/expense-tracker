import { useState } from 'react';
import ExpNav from './ExpNav.jsx'
import AddExpense from './AddExpense.jsx'
import ExpenseSheet from './ExpenseSheet.jsx'
import Pending from './Pending.jsx';
import Owed from './Owed.jsx';

function ExpenseWindow({ logged_in, token }) {
  const [tab, set_tab] = useState('Add Expense');
  const [elem_key, set_elem_key] = useState(0);

  const items = {
    'Add Expense': {
      Elem: AddExpense,
      props: { logged_in, token }
    },
    'Expense Sheet': {
      Elem: ExpenseSheet,
      props: { token }
    },
    'Pending': {
      Elem: Pending,
      props: { token }
    },
    'Owed': {
      Elem: Owed,
      props: { token }
    },
  }

  function update_tab(t) {
    set_tab(t);
    set_elem_key(x => x + 1);
  }

  function set_tab_screen() {
    const { Elem, props } = items[tab];

    return (
      <Elem key={elem_key} {...props} />
    );
  }

  return (
    <>
      <ExpNav tab={tab} update_tab={update_tab} logged_in={logged_in}/>
      {set_tab_screen()}
    </>
  );
}

export default ExpenseWindow;
