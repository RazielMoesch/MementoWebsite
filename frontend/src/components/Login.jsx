import React, { use, useState } from 'react'
import Cookies from 'js-cookie'
import { useNavigate } from 'react-router-dom'
import './Login.css'

const Login = ({ setUsername, setIsLoggedIn }) => {
    const [inputUsername, setInputUsername] = useState("")
    const [inputPassword, setInputPassword] = useState("")
    const [inputConfirmPass, setInputConfirmPass] = useState("")
    const [inputEmail, setInputEmail] = useState("")
    const [receiveEmails, setReceiveEmails] = useState(true)
    const [showPassword, setShowPassword] = useState(false)
    const [loggingIn, setLoggingIn] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const navigate = useNavigate();

    const apicall = "http://localhost:5001/"  // Correct the URL

    const validateInputs = () => {
        if (inputUsername.length < 4) {
            setErrorMessage("Username must be longer than 4 letters")
            return false
        }
        if (inputUsername.length > 25) {
            setErrorMessage("Username cannot be longer than 25 letters.")
            return false
        }

        if (inputPassword.length < 8) {
            setErrorMessage("Password must be longer than 8 letters.")
            return false
        }

        if (inputPassword.length > 45) {
            setErrorMessage("Password cannot be longer than 45 letters.")
            return false
        }

        if (!loggingIn && inputPassword !== inputConfirmPass) {
            setErrorMessage("Passwords do not match.")
            return false
        }

        setErrorMessage("")  // Clear error message if inputs are valid
        return true
    }

    const handleLogin = async () => {
        if (!validateInputs()) return;
    
        try {
            const response = await fetch(`${apicall}login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: inputUsername,
                    password: inputPassword,
                }),
            });
    
            const data = await response.json();
            //console.log("Login Response:", data);  
    
            if (data.worked) {
                setIsLoggedIn(true);
                setUsername(inputUsername);
                Cookies.set('username', inputUsername);  // Store in cookies
                setErrorMessage("");  // Clear error message on success
                navigate("/");
            } else {
                setErrorMessage(data.message || "Login Failed");
            }
    
        } catch (error) {
            console.error("Login Error:", error);
            setErrorMessage("Error During Login: catch");
        }
    };
    

    const handleSignUp = async () => {
        if (!validateInputs()) return
    
        try {
            const response = await fetch(`${apicall}signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: inputUsername,
                    password: inputPassword,
                    email: inputEmail,
                    notify: receiveEmails,
                }),
            })
    
            // Log the response status and body for debugging
            console.log(response);
            const data = await response.json();
    
            console.log(data); // Log the response data
    
            if (data.message === "Signup successful") {
                setLoggingIn(true)  // Switch to login screen after successful sign-up
            } else {
                setErrorMessage(data.message || "Signup Failed")
            }
    
        } catch (error) {
            console.error("Error During Signup", error);
            setErrorMessage("Unknown Error Occurred during Sign Up")
        }
    }
    

    return (
        <div className="login-container">
            {loggingIn ? <h1 className="login-title">Login</h1> : <h1 className="login-title">Sign Up</h1>}

            {loggingIn ? (
                <div className="login-inputs">
                    <input
                        type="text"
                        placeholder="Username"
                        value={inputUsername}
                        onChange={(e) => setInputUsername(e.target.value)}
                    />
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={inputPassword}
                        onChange={(e) => setInputPassword(e.target.value)}
                    />
                </div>
            ) : (
                <div className="login-inputs">
                    <input
                        type="text"
                        placeholder="Username"
                        value={inputUsername}
                        onChange={(e) => setInputUsername(e.target.value)}
                    />
                    <input
                        type="email"
                        placeholder="Email@email.email"
                        value={inputEmail}
                        onChange={(e) => setInputEmail(e.target.value)}
                    />
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={inputPassword}
                        onChange={(e) => setInputPassword(e.target.value)}
                    />
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm Password"
                        value={inputConfirmPass}
                        onChange={(e) => setInputConfirmPass(e.target.value)}
                    />
                    <div className="receive-emails-box">
                        <input
                            type="checkbox"
                            checked={receiveEmails}
                            onChange={() => setReceiveEmails(!receiveEmails)}
                        />
                        <p>Receive Emails?</p>
                    </div>
                </div>
            )}

            {loggingIn ? (
                <div className="login-buttons">
                    <button onClick={() => setShowPassword(!showPassword)}>Show Password</button>
                    <button onClick={handleLogin}>Login</button>
                </div>
            ) : (
                <div className="login-buttons">
                    <button onClick={handleSignUp}>Sign Up</button>
                </div>
            )}

            {loggingIn ? (
                <button onClick={() => setLoggingIn(false)} className="switch-login">
                    Signup Instead?
                </button>
            ) : (
                <button onClick={() => setLoggingIn(true)} className="switch-login">
                    Login Instead?
                </button>
            )}

            <h3 className="error-message">{errorMessage}</h3>
        </div>
    )
}

export default Login
