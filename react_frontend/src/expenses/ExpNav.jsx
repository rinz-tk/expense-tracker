import './Expenses.css'

function ExpNav({ tab, update_tab, logged_in }) {
  const cur_items = ['Add Expense', 'Expense Sheet'];
  if(logged_in.in) {
    cur_items.push('Pending');
    cur_items.push('Owed');
  }

  const items_list = cur_items.map((name, id) => {
    let cls = '';
    if(name === tab) { cls = 'highlighted'; }

    return (
      <button className={cls} key={id} onClick={() => update_tab(name)}>
        {name}
      </button>
    )
  });

  return (
    <div className='exp-nav'>
      {items_list}
    </div>
  );
}

export default ExpNav;
