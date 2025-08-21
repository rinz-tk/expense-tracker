function LogoutWindow({ logged_in, set_logged_in, set_disp }) {
  function logout() {
    set_logged_in({
      in: false,
      usn: '',
      token: ''
    });

    set_disp('Login');
  }

  const msg = `${logged_in.usn} logged in`;

  return (
    <>
      <div className="msg msg_success">
        {msg}
      </div>
      <button onClick={logout}>Logout</button>
    </>
  );
}

export default LogoutWindow
