import { useNavigate } from "react-router-dom";
import "./Demo.css"

const Demo = ({ isLoggedIn }) => {


    const navigate = useNavigate()
    


    return (

        

        <>

        {
            !isLoggedIn ?
            <div className="login-prompt">
                <h1>Must Login before you can access the demo.</h1>
                <button onClick={() => navigate("/login")}>Start Login</button>
            </div>
            :
            <h1>Demo</h1>
        }
        
        

        </>
    );
}


export default Demo