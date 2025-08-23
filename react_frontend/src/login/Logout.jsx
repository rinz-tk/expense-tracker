function LogoutWindow({ logged_in, set_logged_in, set_disp, login_redirect }) {
  function logout() {
    set_logged_in({
      in: false,
      usn: '',
      token: ''
    });

    set_disp('Login');
  }

  let msg = (<></>);

  if(login_redirect.current) {
    msg = (
      <div className='msg msg_success'>
        <span className="bold">{logged_in.usn}</span> logged in
      </div>
    );

    login_redirect.current = false;
  }

  return (
    <>
      {msg}
      <button onClick={logout}>Logout</button>
    </>
  );
}

export default LogoutWindow
