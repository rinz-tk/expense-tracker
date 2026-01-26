package expense_manager

import (
	"encoding/json"
)

type Expense struct {
	Exp uint32 `json:"exp"`
	Desc string `json:"desc"`
	Target uint32 `json:"target"`
}

type AddExpense struct {
	Uid uint32
	Exp Expense
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

func ManageSessionExp(add_chan <-chan AddExpense, get_chan <-chan GetExpense) {
	data := make(map[uint32][]Expense)

	for {
		select {
		case add := <-add_chan:
			data[add.Uid] = append(data[add.Uid], add.Exp);

		case get := <-get_chan:
			ret_data, ok := data[get.Uid]

			if !ok {
				data[get.Uid] = []Expense{}
				ret_data = data[get.Uid]
			}

			get.ReturnObject.Data = ret_data
			ret, err := json.Marshal(get.ReturnObject)

			get.ReturnTo <- GetExpReturnWithError{ Return: ret, Error: err }
		}
	}
}
