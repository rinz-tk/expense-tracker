package map_manager

type MapReadVal[T any] struct {
	Val T
	Ok bool
}

type MapRead[F, T any] struct {
	From F
	WriteTo chan MapReadVal[T]
}

type MapWrite[F, T any] struct {
	From F
	To T
}

type MapCheck[F any] struct {
	From F
	WriteTo chan bool
}

func ManageMap[F comparable, T any](read_chan <-chan MapRead[F, T], write_chan <-chan MapWrite[F, T], check_chan <-chan MapCheck[F]) {
	data := make(map[F]T)

	for {
		select {
		case read := <-read_chan:
			val, ok := data[read.From]
			read.WriteTo <- MapReadVal[T]{ Val: val, Ok: ok }
		case write := <-write_chan:
			data[write.From] = write.To
		case check := <-check_chan:
			_, ok := data[check.From]
			check.WriteTo <- ok
		}
	}
}
