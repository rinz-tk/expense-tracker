import { useState } from 'react'
import './App.css'
import Nav from './Nav.jsx'

function App() {
  const [disp, set_disp] = useState(<></>);

  return (
    <>
      <div id="app">
        <Nav set_disp={set_disp}/>
        <div id="disp">
          {disp}
        </div>
      </div>
    </>
  )
}

export default App
