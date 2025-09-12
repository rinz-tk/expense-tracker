import './Expenses.css'

function ExpNav({ tab, set_tab }) {
  const cur_items = ['Add Expense', 'Expense Sheet'];

  const items_list = cur_items.map((name, id) => {
    let cls = '';
    if(name === tab) { cls = 'highlighted'; }

    return (
      <button className={cls} key={id} onClick={() => set_tab(name)}>
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
