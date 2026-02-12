package expense_manager

import (
	"encoding/json"
	"errors"
	"fmt"

	mm "go_backend/connect/map_manager"
	rm "go_backend/connect/register_manager"
)

type Expense struct {
	Exp uint32 `json:"exp"`
	Desc string `json:"desc"`
	Target uint32 `json:"target"`
}

type PendingExpense struct {
	Exp uint32
	ExpId int
	Partial bool
	PartialId int
}

type Pending struct {
	Amt uint32
	ExpList []PendingExpense
}

type AddSessionExpense struct {
	Uid uint32
	Exp Expense
}

type AddExpense struct {
	Uid uint32
	Exp uint32
	Desc string
	SplitList []string
	ReturnTo chan error
}

type GetExpReturn struct {
	Status string `json:"status"`
	Data []Expense `json:"data"`
	Token string `json:"token"`
}

type GetExpReturnWithError struct {
	Return []byte
	Error error
}

type GetExpense struct {
	Uid uint32
	ReturnObject GetExpReturn
	ReturnTo chan GetExpReturnWithError
}

func log(msg string) {
	fmt.Printf("[Expense Manager] %v\n", msg)
}

func get_expense(data map[uint32][]Expense, get GetExpense) {
	ret_data, ok := data[get.Uid]

	if !ok {
		data[get.Uid] = []Expense{}
		ret_data = data[get.Uid]
	}

	get.ReturnObject.Data = ret_data
	ret, err := json.Marshal(get.ReturnObject)

	get.ReturnTo <- GetExpReturnWithError{ Return: ret, Error: err }
}

func ManageSessionExp(add_chan <-chan AddSessionExpense, get_chan <-chan GetExpense) {
	data := make(map[uint32][]Expense)

	for {
		select {
		case add := <-add_chan:
			expenses := data[add.Uid]
			expenses = append(expenses, add.Exp);
			data[add.Uid] = expenses

			log(fmt.Sprintf("Added expense for session ID %v: %v", add.Uid, expenses[len(expenses) - 1]))

		case get := <-get_chan:
			get_expense(data, get)
		}
	}
}

func add_expense(user_exp map[uint32][]Expense, pending map[uint32]map[uint32]Pending, owed map[uint32]map[uint32]struct{},
		registry_read_chan chan<- mm.MapRead[string, rm.RegistryVal],
		registry_read_recv_chan chan mm.MapReadVal[rm.RegistryVal], add AddExpense) error {
	
	num := uint32(len(add.SplitList) + 1)
	base_val := add.Exp / num
	target := base_val

	extra := add.Exp % num
	if extra > 0 {
		extra -= 1
		target += 1
	}

	expenses := append(user_exp[add.Uid], Expense {
		Exp: add.Exp,
		Desc: add.Desc,
		Target: target,
	})

	exp_id := len(expenses) - 1
	user_exp[add.Uid] = expenses

	log(fmt.Sprintf("Added expense for [User %v]: %v", add.Uid, expenses[len(expenses) - 1]))

	if err := add_pending_expenses(user_exp, pending, owed, registry_read_chan, registry_read_recv_chan,
			add.Uid, exp_id, add.Desc, add.Exp, add.SplitList, base_val, extra); err != nil {
		return err
	}

	return nil
}

func add_pending_expenses(user_exp map[uint32][]Expense, pending map[uint32]map[uint32]Pending, owed map[uint32]map[uint32]struct{},
		registry_read_chan chan<- mm.MapRead[string, rm.RegistryVal], registry_read_recv_chan chan mm.MapReadVal[rm.RegistryVal],
		uid uint32, exp_id int, desc string, exp_total uint32, split_list []string, base_val uint32, extra uint32) error {
	exp_total_base := exp_total
	id_list := []uint32{}

	for _, username := range split_list {
		registry_read_chan <- mm.MapRead[string, rm.RegistryVal]{
			From: username,
			WriteTo: registry_read_recv_chan,
		}

		reg_read := <-registry_read_recv_chan
		if !reg_read.Ok {
			return errors.New("Invalid username in split list")
		}

		id_list = append(id_list, reg_read.Val.Uid)
	}

	for _, id := range id_list {
		exp_base := base_val
		if extra > 0 {
			exp_base += 1
			extra -= 1
		}

		log(fmt.Sprintf("[User %v] owes [User %v] an amount %v", id, uid, exp_base))

		exp := settle_pending()
	}

	return nil
}

func ManageExp(add_chan <-chan AddExpense, get_chan <-chan GetExpense, registry_read_chan chan<- mm.MapRead[string, rm.RegistryVal]) {
	user_exp := make(map[uint32][]Expense)
	pending := make(map[uint32]map[uint32]Pending)
	owed := make(map[uint32]map[uint32]struct{})

	registry_read_recv_chan := make(chan mm.MapReadVal[rm.RegistryVal])

	for {
		select {
		case add := <-add_chan:
			err := add_expense(user_exp, pending, owed, registry_read_chan, registry_read_recv_chan, add)
			add.ReturnTo <- err

		case get := <-get_chan:
			get_expense(user_exp, get)
		}
	}
}
