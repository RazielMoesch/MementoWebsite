import React, {useState} from 'react'
import Cookies from 'js-cookie'
import "./Login.css"

const Login = ({ setUsername, setIsLoggedIn}) => {

    const [inputUsername, setInputUsername] = useState("");
    const [inputPassword, setInputPassword] = useState("");
    const [inputConfirmPass, setInputConfirmPass] = useState("");
    const [inputEmail, setInputEmail] = useState("");
    const [receiveEmails, setReceiveEmails] = useState(true)
    const [showPassword, setShowPassword] = useState(false);
    const [loggingIn, setLoggingIn] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const apicall = "http/localhost:5001/api/";



    const handleLogin = async () => {
        if (inputUsername.length < 4){
            setErrorMessage("Username must be longer than 4 letters")
            return
        }
        if (inputUsername.length > 15) {
            setErrorMessage("Username cannot be longer than 15 letters.")
            return
        }

        if (inputPassword.length < 8) {
            setErrorMessage("Password must be longer than 8 letters.")
            return
        }

        if (inputPassword > 45){
            setErrorMessage("Password cannot be longer than 45 letters.")
            return
        }


        setErrorMessage("")

        //API CALL HERE



    }


    const handleSignUp = async () => {
        if (inputUsername.length < 4){
            setErrorMessage("Username must be longer than 4 letters")
            return
        }
        if (inputUsername.length > 15) {
            setErrorMessage("Username cannot be longer than 15 letters.")
            return
        }

        if (inputPassword.length < 8) {
            setErrorMessage("Password must be longer than 8 letters.")
            return
        }

        if (inputPassword > 45){
            setErrorMessage("Password cannot be longer than 45 letters.")
            return
        }

        if (inputPassword !== inputConfirmPass && !loggingIn) {
            setErrorMessage("Passwords do not match.")
            return
        }

        setErrorMessage("")

        //API CALL HERE
    }


   return (

    <>
        <div className="login-container">

            {
                loggingIn ?
                <h1 className='login-title'>Login</h1>
                :
                <h1 className='login-title'>Sign Up</h1>
            }


            {loggingIn 
            ?
            <div className='login-inputs'>
            <input type="text" placeholder="Username" value={inputUsername} onChange={(e) => {setInputUsername(e.target.value)}}/>
            <input type={showPassword?"text" :"password"} placeholder="Password" value={inputPassword} onChange={(e) => {setInputPassword(e.target.value)}}/>

            
            </div>
            :
            <div className='login-inputs'>
                
                <input type="text" placeholder="Username" value={inputUsername} onChange={(e) => {setInputUsername(e.target.value)}}/>
                <input type="email" placeholder="Email@email.email" value={inputEmail} onChange={(e) => {setInputEmail(e.target.value)}}/>
                <input type={showPassword?"text" :"password"} placeholder="Password" value={inputPassword} onChange={(e) => {setInputPassword(e.target.value)}}/>
                <input type={showPassword?"text" :"password"} placeholder="Confirm Password" value={inputConfirmPass} onChange={(e) => {setInputConfirmPass(e.target.value)}}/>
                <div className='receive-emails-box'>
                <input type="checkbox" checked={receiveEmails} onChange={() => setReceiveEmails(!receiveEmails)}/> 
                <p>Receive Emails?</p>
                </div>
                
               


            </div>
            }

            {
                loggingIn
                ?
                <div className='login-buttons'>
                    <button onClick={() => setShowPassword(!showPassword)}>Show Password</button>
                    <button onClick={() => handleLogin()}>Login</button>
                    
                </div>
                
                :
                <div className='login-buttons'>
                    <button onClick={() => handleSignUp()}>Sign Up</button>
                    
                </div>
                

            }

            {
                loggingIn
                ?
                <button onClick={() => setLoggingIn(false)} className='switch-login'>Signup Instead?</button>
                :
                <button onClick={() => setLoggingIn(true)} className='switch-login'>Login Instead?</button>
            }

            <h3 className='error-message'>{errorMessage}</h3>
            
            


        </div>   
    </>
   )
}

export default Login