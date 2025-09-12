import { useState } from 'react';
import ExpNav from './ExpNav.jsx'
import AddExpense from './AddExpense.jsx'
import ExpenseSheet from './ExpenseSheet.jsx'

function ExpenseWindow({ token }) {
  const [tab, set_tab] = useState('Add Expense');

  const items = {
    'Add Expense': {
      Elem: AddExpense,
      props: { token }
    },
    'Expense Sheet': {
      Elem: ExpenseSheet,
      props: { token }
    },
  }

  function set_tab_screen() {
    const { Elem, props } = items[tab];

    return (
      <Elem {...props} />
    );
  }

  return (
    <>
      <ExpNav tab={tab} set_tab={set_tab}/>
      {set_tab_screen()}
    </>
  );
}

export default ExpenseWindow;
